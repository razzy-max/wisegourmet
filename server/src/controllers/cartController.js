const Cart = require('../models/Cart');
const MenuItem = require('../models/MenuItem');
const Promotion = require('../models/Promotion');
const PromoCode = require('../models/PromoCode');
const asyncHandler = require('../utils/asyncHandler');
const { reconcileCartDiscounts, computeCartDiscount } = require('../utils/cartDiscount');
const { validatePromoCodeEligibility } = require('../utils/promoCodeDiscount');
const { buildMenuItemImageUrl } = require('../utils/dataUrl');
const { isBranchScopingEnabled } = require('../utils/branchScoping');
const { getFeasibleBranchIds, findRemovableConflicts } = require('../utils/branchAvailability');

const MENU_ITEM_POPULATE_FIELDS = 'name price isAvailable availabilityStatus imageUrl imageContentType';

const isInStock = (menuItem) => {
  if (menuItem.availabilityStatus) {
    return menuItem.availabilityStatus === 'in_stock';
  }
  return menuItem.isAvailable;
};

const applyComputedImageUrls = (req, cart) => {
  cart.items.forEach((item) => {
    if (item.menuItem) {
      item.menuItem.imageUrl = buildMenuItemImageUrl(req, item.menuItem);
    }
  });
  return cart;
};

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId }).populate('items.menuItem', MENU_ITEM_POPULATE_FIELDS);
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
    cart = await Cart.findById(cart._id).populate('items.menuItem', MENU_ITEM_POPULATE_FIELDS);
  }
  return cart;
};

const getCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  const changed = reconcileCartDiscounts(cart);
  if (changed) {
    await cart.save();
  }
  const discount = computeCartDiscount(cart);
  res.json({ cart: applyComputedImageUrls(req, cart), discount });
});

const addCartItem = asyncHandler(async (req, res) => {
  const { menuItemId, quantity = 1 } = req.body;
  if (!menuItemId) {
    res.status(400);
    throw new Error('menuItemId is required');
  }

  const menuItem = await MenuItem.findById(menuItemId);
  if (!menuItem) {
    res.status(400);
    throw new Error('Menu item unavailable');
  }

  const cart = await getOrCreateCart(req.user._id);

  if (isBranchScopingEnabled()) {
    // With one combined menu, "in stock" means "some branch has it" — but
    // adding this item must still leave at least one branch able to supply
    // the *whole* cart, or the order would have nowhere to be fulfilled.
    const existingItemIds = cart.items.map((item) => String(item.menuItem._id || item.menuItem));
    const feasibleBranchIds = await getFeasibleBranchIds([...existingItemIds, menuItemId]);

    if (feasibleBranchIds.length === 0) {
      // "Remove the thing I'm trying to add" isn't useful advice — name
      // only the pre-existing cart item(s) whose removal would fix it.
      const culpritIds = (await findRemovableConflicts([...existingItemIds, menuItemId])).filter(
        (id) => id !== String(menuItemId)
      );
      const conflictingNames = cart.items
        .filter((item) => culpritIds.includes(String(item.menuItem._id || item.menuItem)))
        .map((item) => item.nameSnapshot || item.menuItem?.name || 'that item');

      res.status(400);
      if (conflictingNames.length === 0) {
        // Empty cart (this item is out of stock everywhere) — no existing
        // item to blame.
        throw new Error(`${menuItem.name} isn't available to add right now.`);
      }
      const conflictText = conflictingNames.join(' and ');
      throw new Error(
        `${menuItem.name}'s from a different branch than ${conflictText} — remove ${conflictText} to add ${menuItem.name}, or check out now and order ${menuItem.name} separately after.`
      );
    }
  } else if (!isInStock(menuItem)) {
    res.status(400);
    throw new Error('Menu item unavailable');
  }

  const existing = cart.items.find((item) => String(item.menuItem._id || item.menuItem) === String(menuItemId));

  if (existing) {
    existing.quantity += Number(quantity);
    existing.priceSnapshot = menuItem.price;
    existing.nameSnapshot = menuItem.name;
  } else {
    cart.items.push({
      menuItem: menuItem._id,
      nameSnapshot: menuItem.name,
      priceSnapshot: menuItem.price,
      quantity: Number(quantity),
    });
  }

  await cart.save();
  const hydrated = await Cart.findById(cart._id).populate('items.menuItem', MENU_ITEM_POPULATE_FIELDS);
  res.json({ cart: applyComputedImageUrls(req, hydrated) });
});

const updateCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const { quantity } = req.body;

  const cart = await getOrCreateCart(req.user._id);
  const item = cart.items.id(itemId);
  if (!item) {
    res.status(404);
    throw new Error('Cart item not found');
  }

  if (!quantity || Number(quantity) < 1) {
    cart.items.pull({ _id: itemId });
  } else {
    item.quantity = Number(quantity);
  }

  reconcileCartDiscounts(cart);
  await cart.save();
  const hydrated = await Cart.findById(cart._id).populate('items.menuItem', MENU_ITEM_POPULATE_FIELDS);
  const discount = computeCartDiscount(hydrated);
  res.json({ cart: applyComputedImageUrls(req, hydrated), discount });
});

const removeCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.params;
  const cart = await getOrCreateCart(req.user._id);

  const item = cart.items.id(itemId);
  if (!item) {
    res.status(404);
    throw new Error('Cart item not found');
  }

  cart.items.pull({ _id: itemId });
  reconcileCartDiscounts(cart);
  await cart.save();

  const hydrated = await Cart.findById(cart._id).populate('items.menuItem', MENU_ITEM_POPULATE_FIELDS);
  const discount = computeCartDiscount(hydrated);
  res.json({ cart: applyComputedImageUrls(req, hydrated), discount });
});

const clearCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  cart.items = [];
  cart.appliedPromotion = null;
  cart.appliedPromoCode = null;
  await cart.save();
  res.json({ cart });
});

const applyPromotion = asyncHandler(async (req, res) => {
  const { promotionId } = req.body;
  if (!promotionId) {
    res.status(400);
    throw new Error('promotionId is required');
  }

  const promotion = await Promotion.findById(promotionId);
  if (!promotion || !promotion.isActive || promotion.ctaType !== 'combo') {
    res.status(400);
    throw new Error('This deal is no longer available');
  }

  const menuItems = await MenuItem.find({
    _id: { $in: promotion.comboItems.map((item) => item.menuItem) },
  });

  const hasUnavailable = promotion.comboItems.some((requiredItem) => {
    const menuItem = menuItems.find((candidate) => String(candidate._id) === String(requiredItem.menuItem));
    return !menuItem || !isInStock(menuItem);
  });

  if (hasUnavailable) {
    res.status(400);
    throw new Error('One or more combo items are currently unavailable');
  }

  const cart = await getOrCreateCart(req.user._id);

  if (isBranchScopingEnabled()) {
    // Combo items get added automatically here, bypassing the normal
    // add-to-cart button — still needs the same "can one branch fulfill
    // the whole cart" guard, or a combo could silently create an
    // unfulfillable cart.
    const existingItemIds = cart.items.map((item) => String(item.menuItem._id || item.menuItem));
    const comboItemIds = promotion.comboItems.map((item) => String(item.menuItem));
    const candidateItemIds = [...new Set([...existingItemIds, ...comboItemIds])];
    const feasibleBranchIds = await getFeasibleBranchIds(candidateItemIds);

    if (feasibleBranchIds.length === 0) {
      const culpritIds = (await findRemovableConflicts(candidateItemIds)).filter(
        (id) => !comboItemIds.includes(id)
      );
      const conflictingNames = cart.items
        .filter((item) => culpritIds.includes(String(item.menuItem._id || item.menuItem)))
        .map((item) => item.nameSnapshot || item.menuItem?.name || 'that item');

      res.status(400);
      throw new Error(
        conflictingNames.length
          ? `This deal isn't available from the same branch as ${conflictingNames.join(' and ')} — remove ${conflictingNames.join(' and ')} to apply it, or check out separately.`
          : "This deal isn't available with the rest of your cart right now."
      );
    }
  }

  promotion.comboItems.forEach((requiredItem) => {
    const menuItem = menuItems.find((candidate) => String(candidate._id) === String(requiredItem.menuItem));
    const existing = cart.items.find(
      (item) => String(item.menuItem._id || item.menuItem) === String(requiredItem.menuItem)
    );

    if (existing) {
      if (existing.quantity < requiredItem.quantity) {
        existing.quantity = requiredItem.quantity;
      }
    } else {
      cart.items.push({
        menuItem: menuItem._id,
        nameSnapshot: menuItem.name,
        priceSnapshot: menuItem.price,
        quantity: requiredItem.quantity,
      });
    }
  });

  cart.appliedPromoCode = null; // only one discount mechanism active at a time
  cart.appliedPromotion = {
    promotion: promotion._id,
    title: promotion.title,
    discountPercent: promotion.comboDiscountPercent,
    comboItems: promotion.comboItems.map((requiredItem) => {
      const menuItem = menuItems.find((candidate) => String(candidate._id) === String(requiredItem.menuItem));
      return {
        menuItem: requiredItem.menuItem,
        quantity: requiredItem.quantity,
        nameSnapshot: menuItem?.name || '',
      };
    }),
  };

  await cart.save();
  const hydrated = await Cart.findById(cart._id).populate('items.menuItem', MENU_ITEM_POPULATE_FIELDS);
  const discount = computeCartDiscount(hydrated);
  res.json({ cart: applyComputedImageUrls(req, hydrated), discount });
});

const clearPromotion = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  cart.appliedPromotion = null;
  await cart.save();
  res.json({ cart });
});

const applyPromoCode = asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code || !String(code).trim()) {
    res.status(400);
    throw new Error('A promo code is required');
  }

  const promoCode = await PromoCode.findOne({ code: String(code).trim().toUpperCase() });
  if (!promoCode) {
    res.status(400);
    throw new Error('Invalid promo code');
  }

  const cart = await getOrCreateCart(req.user._id);
  const subtotal = cart.items.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0);

  const eligibility = await validatePromoCodeEligibility(promoCode, req.user._id, subtotal);
  if (!eligibility.valid) {
    res.status(400);
    throw new Error(eligibility.reason);
  }

  let itemsSnapshot = [];

  if (promoCode.scope === 'items') {
    const menuItems = await MenuItem.find({ _id: { $in: promoCode.items.map((item) => item.menuItem) } });

    const hasUnavailable = promoCode.items.some((requiredItem) => {
      const menuItem = menuItems.find((candidate) => String(candidate._id) === String(requiredItem.menuItem));
      return !menuItem || !isInStock(menuItem);
    });

    if (hasUnavailable) {
      res.status(400);
      throw new Error('One or more items required by this promo code are currently unavailable');
    }

    if (isBranchScopingEnabled()) {
      const existingItemIds = cart.items.map((item) => String(item.menuItem._id || item.menuItem));
      const promoItemIds = promoCode.items.map((item) => String(item.menuItem));
      const candidateItemIds = [...new Set([...existingItemIds, ...promoItemIds])];
      const feasibleBranchIds = await getFeasibleBranchIds(candidateItemIds);

      if (feasibleBranchIds.length === 0) {
        const culpritIds = (await findRemovableConflicts(candidateItemIds)).filter(
          (id) => !promoItemIds.includes(id)
        );
        const conflictingNames = cart.items
          .filter((item) => culpritIds.includes(String(item.menuItem._id || item.menuItem)))
          .map((item) => item.nameSnapshot || item.menuItem?.name || 'that item');

        res.status(400);
        throw new Error(
          conflictingNames.length
            ? `This promo code isn't available from the same branch as ${conflictingNames.join(' and ')} — remove ${conflictingNames.join(' and ')} to apply it, or check out separately.`
            : "This promo code isn't available with the rest of your cart right now."
        );
      }
    }

    promoCode.items.forEach((requiredItem) => {
      const menuItem = menuItems.find((candidate) => String(candidate._id) === String(requiredItem.menuItem));
      const existing = cart.items.find(
        (item) => String(item.menuItem._id || item.menuItem) === String(requiredItem.menuItem)
      );

      if (existing) {
        if (existing.quantity < requiredItem.quantity) {
          existing.quantity = requiredItem.quantity;
        }
      } else {
        cart.items.push({
          menuItem: menuItem._id,
          nameSnapshot: menuItem.name,
          priceSnapshot: menuItem.price,
          quantity: requiredItem.quantity,
        });
      }
    });

    itemsSnapshot = promoCode.items.map((requiredItem) => {
      const menuItem = menuItems.find((candidate) => String(candidate._id) === String(requiredItem.menuItem));
      return {
        menuItem: requiredItem.menuItem,
        quantity: requiredItem.quantity,
        nameSnapshot: menuItem?.name || '',
      };
    });
  }

  cart.appliedPromotion = null; // only one discount mechanism active at a time
  cart.appliedPromoCode = {
    promoCode: promoCode._id,
    code: promoCode.code,
    scope: promoCode.scope,
    discountType: promoCode.discountType,
    discountValue: promoCode.discountValue,
    maxDiscountAmount: promoCode.maxDiscountAmount,
    items: itemsSnapshot,
  };

  await cart.save();
  const hydrated = await Cart.findById(cart._id).populate('items.menuItem', MENU_ITEM_POPULATE_FIELDS);
  const discount = computeCartDiscount(hydrated);
  res.json({ cart: applyComputedImageUrls(req, hydrated), discount });
});

const removePromoCode = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  cart.appliedPromoCode = null;
  await cart.save();
  res.json({ cart });
});

module.exports = {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
  applyPromotion,
  clearPromotion,
  applyPromoCode,
  removePromoCode,
};

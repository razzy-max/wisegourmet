const Cart = require('../models/Cart');
const MenuItem = require('../models/MenuItem');
const Promotion = require('../models/Promotion');
const asyncHandler = require('../utils/asyncHandler');
const { computeComboDiscount, reconcileAppliedPromotion } = require('../utils/comboDiscount');
const { buildMenuItemImageUrl } = require('../utils/dataUrl');

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
  const changed = reconcileAppliedPromotion(cart);
  if (changed) {
    await cart.save();
  }
  const discount = computeComboDiscount(cart.items, cart.appliedPromotion);
  res.json({ cart: applyComputedImageUrls(req, cart), discount });
});

const addCartItem = asyncHandler(async (req, res) => {
  const { menuItemId, quantity = 1 } = req.body;
  if (!menuItemId) {
    res.status(400);
    throw new Error('menuItemId is required');
  }

  const menuItem = await MenuItem.findById(menuItemId);
  if (!menuItem || !isInStock(menuItem)) {
    res.status(400);
    throw new Error('Menu item unavailable');
  }

  const cart = await getOrCreateCart(req.user._id);
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

  reconcileAppliedPromotion(cart);
  await cart.save();
  const hydrated = await Cart.findById(cart._id).populate('items.menuItem', MENU_ITEM_POPULATE_FIELDS);
  const discount = computeComboDiscount(hydrated.items, hydrated.appliedPromotion);
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
  reconcileAppliedPromotion(cart);
  await cart.save();

  const hydrated = await Cart.findById(cart._id).populate('items.menuItem', MENU_ITEM_POPULATE_FIELDS);
  const discount = computeComboDiscount(hydrated.items, hydrated.appliedPromotion);
  res.json({ cart: applyComputedImageUrls(req, hydrated), discount });
});

const clearCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  cart.items = [];
  cart.appliedPromotion = null;
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
  const discount = computeComboDiscount(hydrated.items, hydrated.appliedPromotion);
  res.json({ cart: applyComputedImageUrls(req, hydrated), discount });
});

const clearPromotion = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  cart.appliedPromotion = null;
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
};

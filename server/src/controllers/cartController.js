const Cart = require('../models/Cart');
const MenuItem = require('../models/MenuItem');
const asyncHandler = require('../utils/asyncHandler');

const isInStock = (menuItem) => {
  if (menuItem.availabilityStatus) {
    return menuItem.availabilityStatus === 'in_stock';
  }
  return menuItem.isAvailable;
};

const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ user: userId }).populate(
    'items.menuItem',
    'name price isAvailable availabilityStatus imageUrl'
  );
  if (!cart) {
    cart = await Cart.create({ user: userId, items: [] });
    cart = await Cart.findById(cart._id).populate(
      'items.menuItem',
      'name price isAvailable availabilityStatus imageUrl'
    );
  }
  return cart;
};

const getCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  res.json({ cart });
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
  const hydrated = await Cart.findById(cart._id).populate(
    'items.menuItem',
    'name price isAvailable availabilityStatus imageUrl'
  );
  res.json({ cart: hydrated });
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

  await cart.save();
  const hydrated = await Cart.findById(cart._id).populate(
    'items.menuItem',
    'name price isAvailable availabilityStatus imageUrl'
  );
  res.json({ cart: hydrated });
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
  await cart.save();

  const hydrated = await Cart.findById(cart._id).populate(
    'items.menuItem',
    'name price isAvailable availabilityStatus imageUrl'
  );
  res.json({ cart: hydrated });
});

const clearCart = asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req.user._id);
  cart.items = [];
  await cart.save();
  res.json({ cart });
});

module.exports = {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
};

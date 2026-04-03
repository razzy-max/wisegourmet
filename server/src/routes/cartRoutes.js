const express = require('express');
const {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
} = require('../controllers/cartController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('customer'));

router.get('/', getCart);
router.post('/items', addCartItem);
router.put('/items/:itemId', updateCartItem);
router.delete('/items/:itemId', removeCartItem);
router.delete('/clear', clearCart);

module.exports = router;

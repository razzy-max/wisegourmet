const express = require('express');
const {
  getCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
  clearCart,
  applyPromotion,
  clearPromotion,
  applyPromoCode,
  removePromoCode,
} = require('../controllers/cartController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('customer'));

router.get('/', getCart);
router.post('/items', addCartItem);
router.put('/items/:itemId', updateCartItem);
router.delete('/items/:itemId', removeCartItem);
router.delete('/clear', clearCart);
router.post('/apply-promotion', applyPromotion);
router.delete('/promotion', clearPromotion);
router.post('/promo-code', applyPromoCode);
router.delete('/promo-code', removePromoCode);

module.exports = router;

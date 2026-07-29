const express = require('express');
const {
  listPromotions,
  listPromotionsAdmin,
  getPromotionImage,
  createPromotion,
  updatePromotion,
  deletePromotion,
  reorderPromotions,
} = require('../controllers/promotionController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', listPromotions);
router.get('/admin', protect, authorize('admin'), listPromotionsAdmin);
router.get('/:id/image', getPromotionImage);
router.patch('/reorder', protect, authorize('admin'), reorderPromotions);
router.post('/', protect, authorize('admin'), createPromotion);
router.patch('/:id', protect, authorize('admin'), updatePromotion);
router.delete('/:id', protect, authorize('admin'), deletePromotion);

module.exports = router;

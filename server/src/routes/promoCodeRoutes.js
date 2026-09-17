const express = require('express');
const {
  listPromoCodesAdmin,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
} = require('../controllers/promoCodeController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(protect, authorize('admin'));

router.get('/', listPromoCodesAdmin);
router.post('/', createPromoCode);
router.patch('/:id', updatePromoCode);
router.delete('/:id', deletePromoCode);

module.exports = router;

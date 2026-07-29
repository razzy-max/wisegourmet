const express = require('express');
const {
  getHeroBackground,
  getHeroBackgroundImage,
  updateHeroBackground,
} = require('../controllers/heroBackgroundController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', getHeroBackground);
router.get('/image', getHeroBackgroundImage);
router.put('/', protect, authorize('admin'), updateHeroBackground);

module.exports = router;

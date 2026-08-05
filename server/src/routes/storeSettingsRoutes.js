const express = require('express');
const { getStoreSettings, updateStoreSettings } = require('../controllers/storeSettingsController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', getStoreSettings);
router.put('/', protect, authorize('admin'), updateStoreSettings);

module.exports = router;

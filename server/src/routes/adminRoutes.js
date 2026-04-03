const express = require('express');
const { getOverviewStats, purgeSeededData } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/stats/overview', protect, authorize('admin'), getOverviewStats);
router.delete('/seeded-data', protect, authorize('admin'), purgeSeededData);

module.exports = router;

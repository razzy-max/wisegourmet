const express = require('express');
const { getOverviewStats } = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/stats/overview', protect, authorize('admin'), getOverviewStats);

module.exports = router;

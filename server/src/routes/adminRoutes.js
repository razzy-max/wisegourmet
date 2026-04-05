const express = require('express');
const {
	getOverviewStats,
	purgeSeededData,
	getDeliveryZones,
	createDeliveryZone,
	updateDeliveryZone,
	deleteDeliveryZone,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/stats/overview', protect, authorize('admin'), getOverviewStats);
router.delete('/seeded-data', protect, authorize('admin'), purgeSeededData);
router.get('/delivery-zones', protect, authorize('admin'), getDeliveryZones);
router.post('/delivery-zones', protect, authorize('admin'), createDeliveryZone);
router.patch('/delivery-zones/:id', protect, authorize('admin'), updateDeliveryZone);
router.delete('/delivery-zones/:id', protect, authorize('admin'), deleteDeliveryZone);

module.exports = router;

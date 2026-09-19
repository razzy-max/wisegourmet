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

router.get('/stats/overview', protect, authorize('admin', 'branch_admin'), getOverviewStats);
router.delete('/seeded-data', protect, authorize('admin'), purgeSeededData);
router.get('/delivery-zones', protect, authorize('admin', 'branch_admin'), getDeliveryZones);
router.post('/delivery-zones', protect, authorize('admin', 'branch_admin'), createDeliveryZone);
router.patch('/delivery-zones/:id', protect, authorize('admin', 'branch_admin'), updateDeliveryZone);
router.delete('/delivery-zones/:id', protect, authorize('admin', 'branch_admin'), deleteDeliveryZone);

module.exports = router;

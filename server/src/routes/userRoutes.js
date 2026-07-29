const express = require('express');
const {
	listCustomers,
	sendReEngagementMessage,
	listRiders,
	listTeamMembers,
	createTeamMember,
	deleteTeamMember,
	resetTeamMemberPassword,
	getNotificationConfig,
	getNotificationStatus,
	subscribeNotifications,
	unsubscribeNotifications,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/customers', protect, authorize('admin'), listCustomers);
router.post('/customers/notify', protect, authorize('admin'), sendReEngagementMessage);
router.get('/riders', protect, authorize('admin', 'staff'), listRiders);
router.get('/team', protect, authorize('admin'), listTeamMembers);
router.post('/team', protect, authorize('admin'), createTeamMember);
router.delete('/team/:id', protect, authorize('admin'), deleteTeamMember);
router.patch('/team/:id/password', protect, authorize('admin'), resetTeamMemberPassword);
router.get('/notifications/config', protect, getNotificationConfig);
router.get('/notifications/status', protect, getNotificationStatus);
router.post('/notifications/subscribe', protect, subscribeNotifications);
router.post('/notifications/unsubscribe', protect, unsubscribeNotifications);

module.exports = router;

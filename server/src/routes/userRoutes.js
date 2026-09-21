const express = require('express');
const {
	listCustomers,
	deleteCustomer,
	sendReEngagementMessage,
	getReengagementSettings,
	updateReengagementSettings,
	listRiders,
	listTeamMembers,
	createTeamMember,
	updateTeamMemberBranches,
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
router.delete('/customers/:id', protect, authorize('admin'), deleteCustomer);
router.post('/customers/notify', protect, authorize('admin'), sendReEngagementMessage);
router.get('/reengagement-settings', protect, authorize('admin'), getReengagementSettings);
router.put('/reengagement-settings', protect, authorize('admin'), updateReengagementSettings);
router.get('/riders', protect, authorize('admin', 'staff'), listRiders);
router.get('/team', protect, authorize('admin', 'branch_admin'), listTeamMembers);
router.post('/team', protect, authorize('admin', 'branch_admin'), createTeamMember);
router.patch('/team/:id/branches', protect, authorize('admin', 'branch_admin'), updateTeamMemberBranches);
router.delete('/team/:id', protect, authorize('admin', 'branch_admin'), deleteTeamMember);
router.patch('/team/:id/password', protect, authorize('admin', 'branch_admin'), resetTeamMemberPassword);
router.get('/notifications/config', protect, getNotificationConfig);
router.get('/notifications/status', protect, getNotificationStatus);
router.post('/notifications/subscribe', protect, subscribeNotifications);
router.post('/notifications/unsubscribe', protect, unsubscribeNotifications);

module.exports = router;

const express = require('express');
const {
	listRiders,
	listTeamMembers,
	createTeamMember,
	deleteTeamMember,
	resetTeamMemberPassword,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/riders', protect, authorize('admin', 'staff'), listRiders);
router.get('/team', protect, authorize('admin'), listTeamMembers);
router.post('/team', protect, authorize('admin'), createTeamMember);
router.delete('/team/:id', protect, authorize('admin'), deleteTeamMember);
router.patch('/team/:id/password', protect, authorize('admin'), resetTeamMemberPassword);

module.exports = router;

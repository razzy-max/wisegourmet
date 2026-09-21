const express = require('express');
const {
  register, login, me, changePassword, updateProfile,
  forgotPassword, resetPassword, closeAccount,
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, me);
router.patch('/change-password', protect, changePassword);
router.patch('/profile', protect, updateProfile);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/close-account', protect, authorize('customer'), closeAccount);

module.exports = router;

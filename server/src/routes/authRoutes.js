const express = require('express');
const { register, login, me, changePassword, updateProfile } = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, me);
router.patch('/change-password', protect, changePassword);
router.patch('/profile', protect, updateProfile);

module.exports = router;

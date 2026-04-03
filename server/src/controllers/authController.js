const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const sanitizeUser = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  isActive: user.isActive,
  createdAt: user.createdAt,
  savedAddress: user.savedAddress || {
    fullText: '',
    area: '',
    landmark: '',
    notes: '',
    zone: '',
  },
});

const register = asyncHandler(async (req, res) => {
  const { fullName, email, password, phone } = req.body;

  if (!fullName || !email || !password) {
    res.status(400);
    throw new Error('fullName, email and password are required');
  }

  const exists = await User.findOne({ email: email.toLowerCase().trim() });
  if (exists) {
    res.status(400);
    throw new Error('Email already in use');
  }

  const user = await User.create({
    fullName,
    email,
    password,
    phone,
    role: 'customer',
  });

  const token = signToken(user._id);
  res.status(201).json({ token, user: sanitizeUser(user) });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('email and password are required');
  }

  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error('Invalid email or password');
  }

  const token = signToken(user._id);
  res.json({ token, user: sanitizeUser(user) });
});

const me = asyncHandler(async (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400);
    throw new Error('currentPassword and newPassword are required');
  }

  if (String(newPassword).length < 6) {
    res.status(400);
    throw new Error('newPassword must be at least 6 characters');
  }

  const user = await User.findById(req.user._id).select('+password');
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  const validCurrent = await user.matchPassword(currentPassword);
  if (!validCurrent) {
    res.status(401);
    throw new Error('Current password is incorrect');
  }

  user.password = newPassword;
  await user.save();

  res.json({ ok: true, message: 'Password updated successfully' });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { fullName, phone, savedAddress } = req.body;
  const user = await User.findById(req.user._id).select('-password');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (fullName !== undefined) {
    user.fullName = fullName;
  }

  if (phone !== undefined) {
    user.phone = phone;
  }

  if (savedAddress && typeof savedAddress === 'object') {
    user.savedAddress = {
      fullText: savedAddress.fullText || '',
      area: savedAddress.area || '',
      landmark: savedAddress.landmark || '',
      notes: savedAddress.notes || '',
      zone: savedAddress.zone || '',
    };
  }

  await user.save();

  res.json({ user: sanitizeUser(user) });
});

module.exports = {
  register,
  login,
  me,
  changePassword,
  updateProfile,
};

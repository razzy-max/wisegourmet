const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { sendEmail, wrapEmail, button } = require('../utils/email');

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// Requires a domain with a real TLD (e.g. "gmail.com", not just "gmail") —
// loose enough not to reject real addresses, strict enough to catch typos
// that would otherwise only surface later as a cryptic Paystack/email failure.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const isValidEmail = (email) => EMAIL_PATTERN.test(String(email || '').trim());

const sanitizeUser = (user) => ({
  id: user._id,
  fullName: user.fullName,
  email: user.email,
  phone: user.phone,
  role: user.role,
  branches: user.branches || [],
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

  if (!isValidEmail(email)) {
    res.status(400);
    throw new Error('Please enter a valid email address (e.g. name@gmail.com)');
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

  if (!user.isActive) {
    res.status(403);
    throw new Error('This account has been closed.');
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
  const { fullName, email, phone, savedAddress } = req.body;
  const user = await User.findById(req.user._id).select('-password');

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  if (fullName !== undefined) {
    user.fullName = fullName;
  }

  if (email !== undefined && email.toLowerCase().trim() !== user.email) {
    if (!isValidEmail(email)) {
      res.status(400);
      throw new Error('Please enter a valid email address (e.g. name@gmail.com)');
    }
    const normalizedEmail = email.toLowerCase().trim();
    const exists = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
    if (exists) {
      res.status(400);
      throw new Error('Email already in use');
    }
    user.email = normalizedEmail;
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

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    res.status(400);
    throw new Error('email is required');
  }

  const user = await User.findOne({ email: String(email).toLowerCase().trim() });

  // Same response whether the account exists or not — otherwise this
  // endpoint becomes a way to check which emails are registered.
  if (user) {
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = hashToken(rawToken);
    user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    await sendEmail({
      to: user.email,
      subject: 'Reset your Wise Gourmet password',
      html: wrapEmail(
        'Reset your password',
        `<p style="font-size:15px;line-height:1.5;">We got a request to reset the password for your Wise Gourmet account. This link expires in 1 hour.</p>
         ${button(resetLink, 'Reset Password')}
         <p style="font-size:13px;color:#6b6259;">If you didn’t ask for this, you can safely ignore this email &mdash; your password won’t change.</p>`
      ),
    });
  }

  res.json({ message: 'If that email is registered, a reset link has been sent.' });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, token, newPassword } = req.body;

  if (!email || !token || !newPassword) {
    res.status(400);
    throw new Error('email, token and newPassword are required');
  }

  if (String(newPassword).length < 6) {
    res.status(400);
    throw new Error('newPassword must be at least 6 characters');
  }

  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select(
    '+passwordResetTokenHash +passwordResetExpires'
  );

  const tokenMatches = user?.passwordResetTokenHash === hashToken(token);
  const notExpired = user?.passwordResetExpires && user.passwordResetExpires.getTime() > Date.now();

  if (!user || !tokenMatches || !notExpired) {
    res.status(400);
    throw new Error('This reset link is invalid or has expired. Please request a new one.');
  }

  user.password = newPassword;
  user.passwordResetTokenHash = null;
  user.passwordResetExpires = null;
  await user.save();

  res.json({ message: 'Password reset successfully. You can now log in with your new password.' });
});

// Self-service — deactivates rather than deletes, so order history keeps
// showing a real name instead of "Unknown customer." Password-gated since
// this is a destructive, one-way action from the account's own perspective
// (they'd need to register fresh, or ask an admin to reactivate them).
const closeAccount = asyncHandler(async (req, res) => {
  const { password } = req.body;

  if (!password) {
    res.status(400);
    throw new Error('password is required to confirm closing your account');
  }

  const user = await User.findById(req.user._id).select('+password');
  const validPassword = await user.matchPassword(password);
  if (!validPassword) {
    res.status(401);
    throw new Error('Incorrect password');
  }

  user.isActive = false;
  await user.save();

  res.json({ message: 'Your account has been closed.' });
});

module.exports = {
  register,
  login,
  me,
  forgotPassword,
  resetPassword,
  closeAccount,
  changePassword,
  updateProfile,
};

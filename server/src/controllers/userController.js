const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

const listRiders = asyncHandler(async (_req, res) => {
  const riders = await User.find({ role: 'rider', isActive: true })
    .select('fullName email phone role')
    .sort({ fullName: 1 });

  res.json({ riders });
});

const listTeamMembers = asyncHandler(async (_req, res) => {
  const users = await User.find({ role: { $in: ['staff', 'rider', 'support'] } })
    .select('fullName email phone role isActive createdAt')
    .sort({ createdAt: -1 });

  res.json({ users });
});

const createTeamMember = asyncHandler(async (req, res) => {
  const { fullName, email, password, phone = '', role } = req.body;

  if (!fullName || !email || !password || !role) {
    res.status(400);
    throw new Error('fullName, email, password and role are required');
  }

  if (!['staff', 'rider', 'support'].includes(role)) {
    res.status(400);
    throw new Error('Role must be staff, rider, or support');
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    res.status(400);
    throw new Error('Email already in use');
  }

  const user = await User.create({
    fullName,
    email: normalizedEmail,
    password,
    phone,
    role,
    isActive: true,
  });

  res.status(201).json({
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    },
    temporaryPassword: password,
  });
});

const deleteTeamMember = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    res.status(404);
    throw new Error('Team member not found');
  }

  if (!['staff', 'rider', 'support'].includes(user.role)) {
    res.status(400);
    throw new Error('Only staff, rider, or support accounts can be deleted here');
  }

  await User.deleteOne({ _id: user._id });
  res.json({ ok: true, deletedUserId: id });
});

const resetTeamMemberPassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || String(newPassword).length < 6) {
    res.status(400);
    throw new Error('newPassword with minimum length 6 is required');
  }

  const user = await User.findById(id).select('+password');
  if (!user) {
    res.status(404);
    throw new Error('Team member not found');
  }

  if (!['staff', 'rider', 'support'].includes(user.role)) {
    res.status(400);
    throw new Error('Only staff, rider, or support accounts can be reset here');
  }

  user.password = newPassword;
  await user.save();

  res.json({
    ok: true,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
    },
    temporaryPassword: newPassword,
    note: 'Existing passwords are hashed and cannot be viewed directly. Use reset to issue a new one.',
  });
});

module.exports = {
  listRiders,
  listTeamMembers,
  createTeamMember,
  deleteTeamMember,
  resetTeamMemberPassword,
};

const User = require('../models/User');
const ReengagementSettings = require('../models/ReengagementSettings');
const asyncHandler = require('../utils/asyncHandler');
const { isPushConfigured, getPushPublicKey, sendPushToUserIds } = require('../utils/pushNotifications');
const { getCustomersWithLastOrder } = require('../utils/customerActivity');

const normalizeSubscription = (subscription) => {
  if (!subscription || typeof subscription !== 'object') {
    return null;
  }

  const endpoint = String(subscription.endpoint || '').trim();
  const p256dh = String(subscription?.keys?.p256dh || '').trim();
  const auth = String(subscription?.keys?.auth || '').trim();

  if (!endpoint || !p256dh || !auth) {
    return null;
  }

  return {
    endpoint,
    expirationTime: subscription.expirationTime ? new Date(subscription.expirationTime) : null,
    keys: { p256dh, auth },
  };
};

const listRiders = asyncHandler(async (_req, res) => {
  // Riders aren't branch-restricted (any rider can accept any branch's
  // delivery) — `branches` here is advisory only, shown so an admin/staff
  // member assigning a rider by hand can see who typically covers where.
  const riders = await User.find({ role: 'rider', isActive: true })
    .select('fullName email phone role branches')
    .populate('branches', 'name city')
    .sort({ fullName: 1 });

  res.json({ riders });
});

const listTeamMembers = asyncHandler(async (req, res) => {
  const query = { role: { $in: ['staff', 'branch_admin', 'rider', 'support'] } };

  // A branch_admin only manages their own branch's team, not the whole business.
  if (req.user.role === 'branch_admin') {
    query.branches = { $in: req.user.branches };
  }

  const users = await User.find(query)
    .select('fullName email phone role branches isActive createdAt')
    .populate('branches', 'name city')
    .sort({ createdAt: -1 });

  res.json({ users });
});

const listCustomers = asyncHandler(async (_req, res) => {
  const results = await getCustomersWithLastOrder(
    { role: 'customer' },
    'fullName email phone isActive createdAt'
  );
  results.sort((a, b) => String(a.fullName || '').localeCompare(String(b.fullName || '')));

  res.json({ customers: results });
});

const sendReEngagementMessage = asyncHandler(async (req, res) => {
  const { userIds, title, body } = req.body;

  if (!Array.isArray(userIds) || userIds.length === 0) {
    res.status(400);
    throw new Error('userIds must be a non-empty array');
  }

  if (!body || !String(body).trim()) {
    res.status(400);
    throw new Error('Message body is required');
  }

  const users = await User.find({ _id: { $in: userIds }, role: 'customer' }).select('_id pushSubscriptions');
  const eligibleIds = users.filter((user) => user.pushSubscriptions.length > 0).map((user) => String(user._id));
  const noSubscription = users.length - eligibleIds.length;

  if (eligibleIds.length > 0) {
    await sendPushToUserIds(eligibleIds, {
      title,
      body: String(body).trim(),
      url: '/',
      tag: `re-engagement-${Date.now()}`,
    });
  }

  res.json({ sent: eligibleIds.length, noSubscription, total: users.length });
});

const getReengagementSettings = asyncHandler(async (_req, res) => {
  const settings = (await ReengagementSettings.findOne()) || new ReengagementSettings();
  res.json({ settings });
});

const updateReengagementSettings = asyncHandler(async (req, res) => {
  const { enabled, thresholdHours, repeatIntervalHours, title, body } = req.body;

  let settings = await ReengagementSettings.findOne();
  if (!settings) {
    settings = new ReengagementSettings();
  }

  if (enabled !== undefined) {
    settings.enabled = Boolean(enabled);
  }
  if (thresholdHours !== undefined) {
    settings.thresholdHours = Math.max(1, Number(thresholdHours) || settings.thresholdHours);
  }
  if (repeatIntervalHours !== undefined) {
    settings.repeatIntervalHours = Math.max(1, Number(repeatIntervalHours) || settings.repeatIntervalHours);
  }
  if (title !== undefined) {
    settings.title = String(title).trim();
  }
  if (body !== undefined) {
    settings.body = String(body).trim();
  }

  await settings.save();
  res.json({ settings });
});

const createTeamMember = asyncHandler(async (req, res) => {
  const { fullName, email, password, phone = '', role } = req.body;
  let { branches } = req.body;

  if (!fullName || !email || !password || !role) {
    res.status(400);
    throw new Error('fullName, email, password and role are required');
  }

  const allowedRoles =
    req.user.role === 'branch_admin' ? ['staff', 'rider'] : ['staff', 'branch_admin', 'rider', 'support'];

  if (!allowedRoles.includes(role)) {
    res.status(400);
    throw new Error(`Role must be one of: ${allowedRoles.join(', ')}`);
  }

  // A branch_admin can only ever staff their own branch(es) — whatever they
  // send for `branches` is ignored in favor of their own assignment.
  if (req.user.role === 'branch_admin') {
    branches = req.user.branches;
  }

  if (['staff', 'branch_admin', 'rider'].includes(role) && (!Array.isArray(branches) || branches.length === 0)) {
    res.status(400);
    throw new Error('branches is required for staff, branch_admin, and rider accounts');
  }

  if (['staff', 'branch_admin'].includes(role) && branches.length > 1) {
    res.status(400);
    throw new Error('staff and branch_admin accounts belong to exactly one branch');
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
    branches: ['staff', 'branch_admin', 'rider'].includes(role) ? branches : [],
    isActive: true,
  });

  res.status(201).json({
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      branches: user.branches,
      isActive: user.isActive,
      createdAt: user.createdAt,
    },
    temporaryPassword: password,
  });
});

// Assigns/reassigns which branch(es) an existing team member belongs to —
// the only way to fix accounts that predate branches (e.g. seeded demo
// staff/riders) without deleting and recreating them.
const updateTeamMemberBranches = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { branches } = req.body;

  if (!Array.isArray(branches) || branches.length === 0) {
    res.status(400);
    throw new Error('branches must be a non-empty array');
  }

  const user = await User.findById(id);
  if (!user) {
    res.status(404);
    throw new Error('Team member not found');
  }

  if (!['staff', 'branch_admin', 'rider'].includes(user.role)) {
    res.status(400);
    throw new Error('Only staff, branch_admin, or rider accounts have a branch assignment');
  }

  if (['staff', 'branch_admin'].includes(user.role) && branches.length > 1) {
    res.status(400);
    throw new Error('staff and branch_admin accounts belong to exactly one branch');
  }

  if (req.user.role === 'branch_admin') {
    // A branch_admin can only touch staff/rider already on their own team,
    // and can only (re)assign them to their own branch — not move them
    // elsewhere or reach into another branch's roster.
    const isOwnBranchStaffOrRider =
      ['staff', 'rider'].includes(user.role) &&
      user.branches.some((branchId) => req.user.branches.some((ownId) => String(ownId) === String(branchId)));
    const targetIsOwnBranch = branches.every((branchId) =>
      req.user.branches.some((ownId) => String(ownId) === String(branchId))
    );

    if (!isOwnBranchStaffOrRider || !targetIsOwnBranch) {
      res.status(403);
      throw new Error('You can only manage staff/rider accounts on your own branch');
    }
  }

  user.branches = branches;
  await user.save();

  res.json({
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      branches: user.branches,
    },
  });
});

const deleteTeamMember = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const user = await User.findById(id);
  if (!user) {
    res.status(404);
    throw new Error('Team member not found');
  }

  if (!['staff', 'branch_admin', 'rider', 'support'].includes(user.role)) {
    res.status(400);
    throw new Error('Only staff, branch_admin, rider, or support accounts can be deleted here');
  }

  if (req.user.role === 'branch_admin') {
    const isOwnBranchStaffOrRider =
      ['staff', 'rider'].includes(user.role) &&
      user.branches.some((branchId) => req.user.branches.some((ownId) => String(ownId) === String(branchId)));

    if (!isOwnBranchStaffOrRider) {
      res.status(403);
      throw new Error('You can only manage staff/rider accounts on your own branch');
    }
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

  const user = await User.findById(id).select('+password branches');
  if (!user) {
    res.status(404);
    throw new Error('Team member not found');
  }

  if (!['staff', 'branch_admin', 'rider', 'support'].includes(user.role)) {
    res.status(400);
    throw new Error('Only staff, branch_admin, rider, or support accounts can be reset here');
  }

  if (req.user.role === 'branch_admin') {
    const isOwnBranchStaffOrRider =
      ['staff', 'rider'].includes(user.role) &&
      user.branches.some((branchId) => req.user.branches.some((ownId) => String(ownId) === String(branchId)));

    if (!isOwnBranchStaffOrRider) {
      res.status(403);
      throw new Error('You can only manage staff/rider accounts on your own branch');
    }
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

const getNotificationConfig = asyncHandler(async (_req, res) => {
  res.json({
    enabled: isPushConfigured(),
    publicKey: getPushPublicKey(),
  });
});

const getNotificationStatus = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('pushSubscriptions');
  const count = Array.isArray(user?.pushSubscriptions) ? user.pushSubscriptions.length : 0;
  const endpoint = String(req.query.endpoint || '').trim();
  const subscribed = endpoint
    ? Array.isArray(user?.pushSubscriptions) && user.pushSubscriptions.some((item) => item.endpoint === endpoint)
    : false;

  res.json({
    enabled: isPushConfigured(),
    subscribed,
    subscriptionCount: count,
  });
});

const subscribeNotifications = asyncHandler(async (req, res) => {
  if (!isPushConfigured()) {
    res.status(503);
    throw new Error('Push notifications are not configured');
  }

  const subscription = normalizeSubscription(req.body.subscription);
  if (!subscription) {
    res.status(400);
    throw new Error('Invalid push subscription payload');
  }

  await User.updateMany(
    { _id: { $ne: req.user._id } },
    {
      $pull: {
        pushSubscriptions: { endpoint: subscription.endpoint },
      },
    }
  );

  await User.updateOne(
    { _id: req.user._id },
    {
      $pull: {
        pushSubscriptions: { endpoint: subscription.endpoint },
      },
    }
  );

  await User.updateOne(
    { _id: req.user._id },
    {
      $push: {
        pushSubscriptions: {
          ...subscription,
          userAgent: String(req.headers['user-agent'] || ''),
          createdAt: new Date(),
        },
      },
    }
  );

  res.json({ ok: true });
});

const unsubscribeNotifications = asyncHandler(async (req, res) => {
  const endpoint = String(req.body.endpoint || '').trim();

  if (endpoint) {
    await User.updateOne(
      { _id: req.user._id },
      {
        $pull: {
          pushSubscriptions: { endpoint },
        },
      }
    );
  } else {
    await User.updateOne(
      { _id: req.user._id },
      {
        $set: { pushSubscriptions: [] },
      }
    );
  }

  res.json({ ok: true });
});

module.exports = {
  listCustomers,
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
};

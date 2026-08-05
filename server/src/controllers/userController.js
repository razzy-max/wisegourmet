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
      title: title || 'Store Name',
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
  deleteTeamMember,
  resetTeamMemberPassword,
  getNotificationConfig,
  getNotificationStatus,
  subscribeNotifications,
  unsubscribeNotifications,
};

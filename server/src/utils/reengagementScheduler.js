const ReengagementSettings = require('../models/ReengagementSettings');
const User = require('../models/User');
const { getCustomersWithLastOrder } = require('./customerActivity');
const { sendPushToUserIds } = require('./pushNotifications');

const POLL_INTERVAL_MS = 30 * 60 * 1000;
const INITIAL_DELAY_MS = 60 * 1000;

const runReengagementCheck = async () => {
  const settings = await ReengagementSettings.findOne();
  if (!settings || !settings.enabled || !settings.body) {
    return;
  }

  const now = Date.now();
  const thresholdMs = settings.thresholdHours * 60 * 60 * 1000;
  const repeatMs = settings.repeatIntervalHours * 60 * 60 * 1000;

  const customers = await getCustomersWithLastOrder(
    { role: 'customer', isActive: true },
    'pushSubscriptions lastAutoReengagementSentAt'
  );

  const matched = customers.filter((customer) => {
    const hoursInactiveMs = customer.lastOrderAt ? now - new Date(customer.lastOrderAt).getTime() : Infinity;
    if (hoursInactiveMs < thresholdMs) {
      return false;
    }

    if (!customer.lastAutoReengagementSentAt) {
      return true;
    }

    return now - new Date(customer.lastAutoReengagementSentAt).getTime() >= repeatMs;
  });

  if (!matched.length) {
    return;
  }

  const eligibleIds = matched
    .filter((customer) => Array.isArray(customer.pushSubscriptions) && customer.pushSubscriptions.length > 0)
    .map((customer) => String(customer._id));

  if (eligibleIds.length > 0) {
    await sendPushToUserIds(eligibleIds, {
      title: settings.title || 'Wise Gourmet',
      body: settings.body,
      url: '/',
      tag: 'auto-re-engagement',
    });
  }

  await User.updateMany(
    { _id: { $in: matched.map((customer) => customer._id) } },
    { lastAutoReengagementSentAt: new Date() }
  );

  console.log(
    `Re-engagement scheduler: nudged ${eligibleIds.length}/${matched.length} matched customer(s).`
  );
};

const startReengagementScheduler = () => {
  setTimeout(() => {
    runReengagementCheck().catch((error) => {
      console.error('Re-engagement scheduler check failed:', error.message);
    });
  }, INITIAL_DELAY_MS);

  setInterval(() => {
    runReengagementCheck().catch((error) => {
      console.error('Re-engagement scheduler check failed:', error.message);
    });
  }, POLL_INTERVAL_MS);
};

module.exports = { startReengagementScheduler, runReengagementCheck };

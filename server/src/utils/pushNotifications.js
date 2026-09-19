const webPush = require('web-push');
const User = require('../models/User');

const VAPID_PUBLIC_KEY = process.env.WEB_PUSH_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.WEB_PUSH_VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.WEB_PUSH_SUBJECT || 'mailto:support@wisegourmet.app';

const isPushConfigured = () => Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (isPushConfigured()) {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

const buildPayload = (payload = {}) => ({
  title: payload.title || 'Wise Gourmet',
  body: payload.body || '',
  url: payload.url || '/',
  tag: payload.tag || '',
  icon: payload.icon || '/icon-192.png',
  badge: payload.badge || '/icon-192.png',
});

const cleanupInvalidSubscriptions = async (userId, staleEndpoints = []) => {
  if (!staleEndpoints.length) {
    return;
  }

  await User.updateOne(
    { _id: userId },
    {
      $pull: {
        pushSubscriptions: {
          endpoint: { $in: staleEndpoints },
        },
      },
    }
  );
};

const sendToUserRecord = async (user, payload) => {
  const subscriptions = Array.isArray(user.pushSubscriptions) ? user.pushSubscriptions : [];
  if (!subscriptions.length) {
    return;
  }

  const staleEndpoints = [];

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webPush.sendNotification(subscription, JSON.stringify(payload));
      } catch (error) {
        if (error?.statusCode === 404 || error?.statusCode === 410) {
          staleEndpoints.push(subscription.endpoint);
          return;
        }

        console.error('Push notification send failed:', error.message);
      }
    })
  );

  await cleanupInvalidSubscriptions(user._id, staleEndpoints);
};

// `branchId`, when given, only pings users assigned to that branch — used
// for kitchen work, which is location-bound. Omit it (the default) for
// today's exact behavior: every user with a matching role, everywhere.
// Riders are intentionally never branch-filtered — see the multi-branch plan.
const sendPushToRoles = async (roles = [], payload = {}, { branchId = null } = {}) => {
  if (!isPushConfigured() || !roles.length) {
    return;
  }

  const query = { role: { $in: roles }, isActive: true };
  if (branchId) {
    query.branches = branchId;
  }

  const users = await User.find(query).select('_id pushSubscriptions');
  const normalizedPayload = buildPayload(payload);

  await Promise.all(users.map((user) => sendToUserRecord(user, normalizedPayload)));
};

const sendPushToUserIds = async (userIds = [], payload = {}) => {
  if (!isPushConfigured() || !userIds.length) {
    return;
  }

  const users = await User.find({ _id: { $in: userIds }, isActive: true }).select('_id pushSubscriptions');
  const normalizedPayload = buildPayload(payload);

  await Promise.all(users.map((user) => sendToUserRecord(user, normalizedPayload)));
};

module.exports = {
  isPushConfigured,
  getPushPublicKey: () => VAPID_PUBLIC_KEY,
  sendPushToRoles,
  sendPushToUserIds,
};

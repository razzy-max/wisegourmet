const AppSettings = require('../models/AppSettings');

// Whether branch-scoped order-claiming, real-time targeting, notification
// targeting, and the customer branch picker are active. Backed by a
// singleton DB document (toggled from the Branches admin page) rather than
// an env var, so the owner can flip it on/off instantly without a redeploy.
// Cached in memory because isBranchScopingEnabled() is called synchronously
// from many hot paths (socket identity, order queries, push targeting) —
// loadBranchScopingSetting() populates the cache at boot, and
// setBranchScopingEnabled() keeps it in sync on every write.
let cachedEnabled = false;

const loadBranchScopingSetting = async () => {
  const settings = await AppSettings.findOne().select('branchingEnabled');
  cachedEnabled = Boolean(settings?.branchingEnabled);
  return cachedEnabled;
};

const isBranchScopingEnabled = () => cachedEnabled;

const setBranchScopingEnabled = async (value) => {
  const enabled = Boolean(value);
  await AppSettings.findOneAndUpdate(
    {},
    { $set: { branchingEnabled: enabled } },
    { upsert: true, setDefaultsOnInsert: true }
  );
  cachedEnabled = enabled;
  return cachedEnabled;
};

module.exports = { loadBranchScopingSetting, isBranchScopingEnabled, setBranchScopingEnabled };

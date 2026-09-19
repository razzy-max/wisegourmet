const mongoose = require('mongoose');

// Singleton document — a small home for app-wide toggles that need to be
// flippable at runtime from the admin UI, without a redeploy. Started with
// just the multi-branch rollout switch; add more fields here as needed
// rather than creating a new singleton per feature.
const appSettingsSchema = new mongoose.Schema(
  {
    branchingEnabled: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AppSettings', appSettingsSchema);

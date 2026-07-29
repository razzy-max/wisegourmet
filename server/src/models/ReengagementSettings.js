const mongoose = require('mongoose');

const reengagementSettingsSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
    },
    thresholdHours: {
      type: Number,
      default: 168,
      min: 1,
    },
    repeatIntervalHours: {
      type: Number,
      default: 168,
      min: 1,
    },
    title: {
      type: String,
      default: '',
      trim: true,
    },
    body: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('ReengagementSettings', reengagementSettingsSchema);

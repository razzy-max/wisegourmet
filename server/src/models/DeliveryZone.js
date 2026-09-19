const mongoose = require('mongoose');

const deliveryZoneSchema = new mongoose.Schema(
  {
    // Not required at the schema level yet — legacy zones predate branches;
    // backfilled by the migration script, then hardened once confirmed complete.
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
    },
    key: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    fee: {
      type: Number,
      required: true,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

deliveryZoneSchema.index({ sortOrder: 1, label: 1 });
// Compound, not a bare unique on `key` — two branches can each have their own
// "zone_a"/"outside" zone without colliding.
deliveryZoneSchema.index({ branch: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('DeliveryZone', deliveryZoneSchema);

const mongoose = require('mongoose');

const branchMenuItemStatusSchema = new mongoose.Schema(
  {
    branch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
    },
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true,
    },
    availabilityStatus: {
      type: String,
      enum: ['in_stock', 'sold_out', 'unavailable'],
      default: 'in_stock',
    },
  },
  { timestamps: true }
);

// A branch only ever needs one status row per menu item — no row means
// "use MenuItem.availabilityStatus as the fallback," so branches never need
// backfilling with a full set of rows just to inherit sane defaults.
branchMenuItemStatusSchema.index({ branch: 1, menuItem: 1 }, { unique: true });

module.exports = mongoose.model('BranchMenuItemStatus', branchMenuItemStatusSchema);

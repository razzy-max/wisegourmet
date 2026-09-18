const mongoose = require('mongoose');

const promoCodeItemSchema = new mongoose.Schema(
  {
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  { _id: false }
);

const promoCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    scope: {
      type: String,
      enum: ['storewide', 'items'],
      default: 'storewide',
    },
    discountType: {
      type: String,
      enum: ['percent', 'fixed'],
      default: 'percent',
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    // 0 means no cap. Mainly useful for discountType 'percent' so a big cart doesn't
    // trigger an unexpectedly large discount.
    maxDiscountAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    items: {
      type: [promoCodeItemSchema],
      default: [],
    },
    newCustomersOnly: {
      type: Boolean,
      default: false,
    },
    minOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    // 0 means unlimited.
    usageLimitPerUser: {
      type: Number,
      default: 0,
      min: 0,
    },
    usageLimitTotal: {
      type: Number,
      default: 0,
      min: 0,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    startsAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PromoCode', promoCodeSchema);

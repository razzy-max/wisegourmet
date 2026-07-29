const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true,
    },
    nameSnapshot: {
      type: String,
      required: true,
    },
    priceSnapshot: {
      type: Number,
      required: true,
      min: 0,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      default: 1,
    },
  },
  { _id: true, timestamps: false }
);

const comboItemSnapshotSchema = new mongoose.Schema(
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
    nameSnapshot: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const appliedPromotionSchema = new mongoose.Schema(
  {
    promotion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Promotion',
      required: true,
    },
    title: {
      type: String,
      default: '',
    },
    discountPercent: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    comboItems: {
      type: [comboItemSnapshotSchema],
      default: [],
    },
  },
  { _id: false }
);

const cartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    appliedPromotion: {
      type: appliedPromotionSchema,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Cart', cartSchema);

const mongoose = require('mongoose');
const { ORDER_STATUS } = require('../utils/orderStatus');

const statusTimelineSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      required: true,
    },
    changedAt: {
      type: Date,
      default: Date.now,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { _id: false }
);

const orderItemSchema = new mongoose.Schema(
  {
    menuItem: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MenuItem',
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
    },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: {
      type: [orderItemSchema],
      default: [],
    },
    subtotal: {
      type: Number,
      required: true,
    },
    deliveryFee: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    deliveryRule: {
      mode: {
        type: String,
        enum: ['zone', 'distance'],
        default: 'zone',
      },
      zone: {
        type: String,
        default: 'outside',
      },
      distanceKm: {
        type: Number,
        default: 0,
      },
    },
    deliveryAddress: {
      fullText: {
        type: String,
        required: true,
        trim: true,
      },
      area: {
        type: String,
        default: '',
        trim: true,
      },
      landmark: {
        type: String,
        default: '',
        trim: true,
      },
      notes: {
        type: String,
        default: '',
        trim: true,
      },
      lat: {
        type: Number,
        default: null,
      },
      lng: {
        type: Number,
        default: null,
      },
    },
    payment: {
      provider: {
        type: String,
        default: 'paystack',
      },
      status: {
        type: String,
        enum: ['pending', 'paid', 'failed'],
        default: 'pending',
      },
      reference: {
        type: String,
        default: '',
      },
    },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
    },
    statusTimeline: {
      type: [statusTimelineSchema],
      default: [{ status: ORDER_STATUS.PENDING, note: 'Order placed' }],
    },
    assignedRider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    kitchenHandledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    deliveryPin: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);

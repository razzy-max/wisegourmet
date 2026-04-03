const mongoose = require('mongoose');

const supportAttachmentSchema = new mongoose.Schema(
  {
    fileName: {
      type: String,
      default: '',
      trim: true,
    },
    fileType: {
      type: String,
      default: '',
      trim: true,
    },
    dataUrl: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const supportMessageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    senderRole: {
      type: String,
      enum: ['customer', 'support', 'admin'],
      required: true,
    },
    text: {
      type: String,
      default: '',
      trim: true,
    },
    attachments: {
      type: [supportAttachmentSchema],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const supportTicketSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved'],
      default: 'open',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
    reply: {
      type: String,
      default: '',
      trim: true,
    },
    messages: {
      type: [supportMessageSchema],
      default: [],
    },
    csatRating: {
      type: Number,
      min: 1,
      max: 5,
      default: null,
    },
    csatComment: {
      type: String,
      default: '',
      trim: true,
    },
    csatSubmittedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('SupportTicket', supportTicketSchema);

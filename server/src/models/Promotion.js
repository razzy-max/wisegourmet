const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subtitle: {
      type: String,
      default: '',
      trim: true,
    },
    imageUrl: {
      type: String,
      default: '',
      trim: true,
    },
    imageData: {
      type: String,
      default: '',
      select: false,
    },
    imageContentType: {
      type: String,
      default: '',
    },
    ctaLabel: {
      type: String,
      default: '',
      trim: true,
    },
    ctaLink: {
      type: String,
      default: '',
      trim: true,
    },
    ctaType: {
      type: String,
      enum: ['link', 'combo', 'code'],
      default: 'link',
    },
    // Used when ctaType === 'code': the banner's CTA applies this promo code
    // instead of holding its own separate discount logic. 'combo' is kept
    // as a legacy option so existing banners keep working unchanged.
    promoCode: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PromoCode',
      default: null,
    },
    comboItems: {
      type: [
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
      ],
      default: [],
    },
    comboDiscountPercent: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
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

promotionSchema.index({ sortOrder: 1, createdAt: 1 });

module.exports = mongoose.model('Promotion', promotionSchema);

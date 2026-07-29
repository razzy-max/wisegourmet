const mongoose = require('mongoose');

const heroBackgroundSchema = new mongoose.Schema(
  {
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
  },
  { timestamps: true }
);

module.exports = mongoose.model('HeroBackground', heroBackgroundSchema);

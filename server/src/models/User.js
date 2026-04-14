const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    role: {
      type: String,
      enum: ['customer', 'staff', 'admin', 'rider', 'support'],
      default: 'customer',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    savedAddress: {
      fullText: {
        type: String,
        default: '',
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
      zone: {
        type: String,
        default: '',
        trim: true,
      },
    },
    pushSubscriptions: {
      type: [
        {
          endpoint: {
            type: String,
            required: true,
            trim: true,
          },
          expirationTime: {
            type: Date,
            default: null,
          },
          keys: {
            p256dh: {
              type: String,
              required: true,
              trim: true,
            },
            auth: {
              type: String,
              required: true,
              trim: true,
            },
          },
          userAgent: {
            type: String,
            default: '',
            trim: true,
          },
          createdAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = async function matchPassword(enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

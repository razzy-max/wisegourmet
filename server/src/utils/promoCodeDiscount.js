const Order = require('../models/Order');

const computePromoCodeDiscount = (cartItems, subtotal, appliedPromoCode) => {
  if (!appliedPromoCode) {
    return { discountAmount: 0 };
  }

  if (appliedPromoCode.scope === 'storewide') {
    const raw =
      appliedPromoCode.discountType === 'percent'
        ? subtotal * (appliedPromoCode.discountValue / 100)
        : appliedPromoCode.discountValue;
    let discountAmount = Math.min(Math.round(raw), subtotal);
    if (appliedPromoCode.maxDiscountAmount > 0) {
      discountAmount = Math.min(discountAmount, appliedPromoCode.maxDiscountAmount);
    }
    return { discountAmount };
  }

  // scope === 'items' — same "buy this set, get a discount" mechanic as combo promotions.
  let setsCount = Infinity;
  let rawAmount = 0;

  for (const requiredItem of appliedPromoCode.items) {
    const cartLine = cartItems.find(
      (item) => String(item.menuItem?._id || item.menuItem) === String(requiredItem.menuItem)
    );
    const availableQty = cartLine ? cartLine.quantity : 0;
    const sets = Math.floor(availableQty / requiredItem.quantity);
    setsCount = Math.min(setsCount, sets);
    if (cartLine) {
      rawAmount += requiredItem.quantity * cartLine.priceSnapshot;
    }
  }

  if (!Number.isFinite(setsCount) || setsCount <= 0) {
    return { discountAmount: 0 };
  }

  const eligibleAmount = rawAmount * setsCount;
  const raw =
    appliedPromoCode.discountType === 'percent'
      ? eligibleAmount * (appliedPromoCode.discountValue / 100)
      : Math.min(appliedPromoCode.discountValue, eligibleAmount);

  let discountAmount = Math.round(raw);
  if (appliedPromoCode.maxDiscountAmount > 0) {
    discountAmount = Math.min(discountAmount, appliedPromoCode.maxDiscountAmount);
  }

  return { discountAmount };
};

const reconcileAppliedPromoCode = (cart) => {
  if (!cart.appliedPromoCode || cart.appliedPromoCode.scope !== 'items') {
    return false;
  }

  const missingItem = cart.appliedPromoCode.items.some(
    (requiredItem) =>
      !cart.items.some((item) => String(item.menuItem?._id || item.menuItem) === String(requiredItem.menuItem))
  );

  if (missingItem) {
    cart.appliedPromoCode = null;
    return true;
  }

  return false;
};

const validatePromoCodeEligibility = async (promoCode, userId, subtotal) => {
  const now = new Date();

  if (!promoCode || !promoCode.isActive) {
    return { valid: false, reason: 'This promo code is no longer available.' };
  }

  if (promoCode.startsAt && now < promoCode.startsAt) {
    return { valid: false, reason: 'This promo code is not active yet.' };
  }

  if (promoCode.expiresAt && now > promoCode.expiresAt) {
    return { valid: false, reason: 'This promo code has expired.' };
  }

  if (promoCode.usageLimitTotal > 0 && promoCode.usageCount >= promoCode.usageLimitTotal) {
    return { valid: false, reason: 'This promo code has reached its usage limit.' };
  }

  if (subtotal < promoCode.minOrderValue) {
    return {
      valid: false,
      reason: `This promo code requires a minimum order of ₦${promoCode.minOrderValue.toLocaleString()}.`,
    };
  }

  if (promoCode.newCustomersOnly) {
    const hasPaidOrder = await Order.exists({ customer: userId, 'payment.status': 'paid' });
    if (hasPaidOrder) {
      return { valid: false, reason: 'This promo code is only available to first-time customers.' };
    }
  }

  if (promoCode.usageLimitPerUser > 0) {
    const usedCount = await Order.countDocuments({
      customer: userId,
      'payment.status': 'paid',
      'discount.promoCode': promoCode._id,
    });
    if (usedCount >= promoCode.usageLimitPerUser) {
      return { valid: false, reason: 'You have already used this promo code the maximum number of times.' };
    }
  }

  return { valid: true, reason: '' };
};

module.exports = { computePromoCodeDiscount, reconcileAppliedPromoCode, validatePromoCodeEligibility };

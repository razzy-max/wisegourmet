const { computeComboDiscount, reconcileAppliedPromotion } = require('./comboDiscount');
const { computePromoCodeDiscount, reconcileAppliedPromoCode } = require('./promoCodeDiscount');

// appliedPromotion (banner combo deals) and appliedPromoCode (typed codes)
// are mutually exclusive on a cart — at most one discount is ever active.
const reconcileCartDiscounts = (cart) => {
  const changedPromotion = reconcileAppliedPromotion(cart);
  const changedPromoCode = reconcileAppliedPromoCode(cart);
  return changedPromotion || changedPromoCode;
};

const computeCartDiscount = (cart) => {
  if (cart.appliedPromoCode) {
    const subtotal = cart.items.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0);
    return computePromoCodeDiscount(cart.items, subtotal, cart.appliedPromoCode);
  }
  if (cart.appliedPromotion) {
    return computeComboDiscount(cart.items, cart.appliedPromotion);
  }
  return { discountAmount: 0 };
};

module.exports = { reconcileCartDiscounts, computeCartDiscount };

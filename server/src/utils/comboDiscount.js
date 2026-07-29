const computeComboDiscount = (cartItems, appliedPromotion) => {
  if (!appliedPromotion || !Array.isArray(appliedPromotion.comboItems) || appliedPromotion.comboItems.length === 0) {
    return { discountAmount: 0, setsCount: 0 };
  }

  let setsCount = Infinity;
  let rawAmount = 0;

  for (const requiredItem of appliedPromotion.comboItems) {
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
    return { discountAmount: 0, setsCount: 0 };
  }

  const discountAmount = Math.round(rawAmount * setsCount * (appliedPromotion.discountPercent / 100));
  return { discountAmount, setsCount };
};

const reconcileAppliedPromotion = (cart) => {
  if (!cart.appliedPromotion) {
    return false;
  }

  const missingItem = cart.appliedPromotion.comboItems.some(
    (requiredItem) =>
      !cart.items.some((item) => String(item.menuItem?._id || item.menuItem) === String(requiredItem.menuItem))
  );

  if (missingItem) {
    cart.appliedPromotion = null;
    return true;
  }

  return false;
};

module.exports = { computeComboDiscount, reconcileAppliedPromotion };

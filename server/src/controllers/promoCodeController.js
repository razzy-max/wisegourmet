const PromoCode = require('../models/PromoCode');
const asyncHandler = require('../utils/asyncHandler');

const listPromoCodesAdmin = asyncHandler(async (_req, res) => {
  const promoCodes = await PromoCode.find({}).sort({ createdAt: -1 }).populate('items.menuItem', 'name');
  res.json({ promoCodes });
});

const buildPromoCodeFields = (body) => {
  const {
    code,
    description,
    scope,
    discountType,
    discountValue,
    items,
    newCustomersOnly,
    minOrderValue,
    usageLimitPerUser,
    usageLimitTotal,
    startsAt,
    expiresAt,
    isActive,
  } = body;

  const resolvedScope = scope === 'items' ? 'items' : 'storewide';
  const resolvedDiscountType = discountType === 'fixed' ? 'fixed' : 'percent';

  if (resolvedScope === 'items' && (!Array.isArray(items) || items.length === 0)) {
    throw new Error('Item-scoped promo codes require at least one selected menu item');
  }

  const resolvedDiscountValue = Number(discountValue);
  if (!Number.isFinite(resolvedDiscountValue) || resolvedDiscountValue <= 0) {
    throw new Error('discountValue must be a positive number');
  }

  if (resolvedDiscountType === 'percent' && resolvedDiscountValue > 100) {
    throw new Error('A percent discount cannot exceed 100');
  }

  return {
    code: code !== undefined ? String(code).trim().toUpperCase() : undefined,
    description: description !== undefined ? String(description).trim() : undefined,
    scope: resolvedScope,
    discountType: resolvedDiscountType,
    discountValue: resolvedDiscountValue,
    items: resolvedScope === 'items' ? items : [],
    newCustomersOnly: Boolean(newCustomersOnly),
    minOrderValue: Math.max(0, Number(minOrderValue) || 0),
    usageLimitPerUser: Math.max(0, Number(usageLimitPerUser) || 0),
    usageLimitTotal: Math.max(0, Number(usageLimitTotal) || 0),
    startsAt: startsAt ? new Date(startsAt) : null,
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    isActive: isActive === undefined ? true : Boolean(isActive),
  };
};

const createPromoCode = asyncHandler(async (req, res) => {
  const { code } = req.body;
  if (!code || !String(code).trim()) {
    res.status(400);
    throw new Error('code is required');
  }

  const normalizedCode = String(code).trim().toUpperCase();
  const existing = await PromoCode.findOne({ code: normalizedCode });
  if (existing) {
    res.status(400);
    throw new Error('A promo code with this code already exists');
  }

  let fields;
  try {
    fields = buildPromoCodeFields(req.body);
  } catch (error) {
    res.status(400);
    throw error;
  }

  const promoCode = await PromoCode.create(fields);
  await promoCode.populate('items.menuItem', 'name');
  res.status(201).json({ promoCode });
});

const updatePromoCode = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const promoCode = await PromoCode.findById(id);

  if (!promoCode) {
    res.status(404);
    throw new Error('Promo code not found');
  }

  if (req.body.code !== undefined) {
    const normalizedCode = String(req.body.code).trim().toUpperCase();
    const existing = await PromoCode.findOne({ code: normalizedCode, _id: { $ne: id } });
    if (existing) {
      res.status(400);
      throw new Error('A promo code with this code already exists');
    }
  }

  let fields;
  try {
    fields = buildPromoCodeFields({ ...promoCode.toObject(), ...req.body });
  } catch (error) {
    res.status(400);
    throw error;
  }

  Object.assign(promoCode, fields);
  await promoCode.save();
  await promoCode.populate('items.menuItem', 'name');
  res.json({ promoCode });
});

const deletePromoCode = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const promoCode = await PromoCode.findByIdAndDelete(id);

  if (!promoCode) {
    res.status(404);
    throw new Error('Promo code not found');
  }

  res.json({ message: 'Promo code deleted' });
});

module.exports = {
  listPromoCodesAdmin,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
};

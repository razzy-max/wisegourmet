const Promotion = require('../models/Promotion');
const asyncHandler = require('../utils/asyncHandler');
const { parseDataUrl } = require('../utils/dataUrl');

const notifyPromotionsChanged = (req) => {
  const io = req.app.get('io');
  if (io) {
    io.emit('promotions:changed', { updatedAt: new Date().toISOString() });
  }
};

const buildImageUrl = (req, item) =>
  item.imageContentType ? `${req.protocol}://${req.get('host')}/api/promotions/${item._id}/image` : item.imageUrl || '';

const serializePromotion = (req, doc) => {
  const item = doc.toObject ? doc.toObject() : { ...doc };
  item.imageUrl = buildImageUrl(req, item);
  delete item.imageContentType;
  delete item.imageData;
  return item;
};

const listPromotions = asyncHandler(async (req, res) => {
  const promotions = await Promotion.find({ isActive: true })
    .sort({ sortOrder: 1, createdAt: 1 })
    .populate('comboItems.menuItem', 'name');
  res.json({ promotions: promotions.map((item) => serializePromotion(req, item)) });
});

const listPromotionsAdmin = asyncHandler(async (req, res) => {
  const promotions = await Promotion.find({})
    .sort({ sortOrder: 1, createdAt: 1 })
    .populate('comboItems.menuItem', 'name');
  res.json({ promotions: promotions.map((item) => serializePromotion(req, item)) });
});

const getPromotionImage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const item = await Promotion.findById(id).select('+imageData imageContentType');

  if (!item || !item.imageData) {
    res.status(404);
    throw new Error('Image not found');
  }

  res.set({
    'Content-Type': item.imageContentType || 'application/octet-stream',
    'Cache-Control': 'public, max-age=86400',
  });
  res.send(Buffer.from(item.imageData, 'base64'));
});

const createPromotion = asyncHandler(async (req, res) => {
  const {
    title,
    subtitle,
    imageUrl,
    ctaLabel,
    ctaLink,
    ctaType,
    comboItems,
    comboDiscountPercent,
    isActive,
    sortOrder,
  } = req.body;

  if (!title) {
    res.status(400);
    throw new Error('Title is required');
  }

  const resolvedCtaType = ctaType === 'combo' ? 'combo' : 'link';

  if (resolvedCtaType === 'combo' && (!Array.isArray(comboItems) || comboItems.length === 0)) {
    res.status(400);
    throw new Error('Combo deals require at least one selected menu item');
  }

  const parsedImage = parseDataUrl(imageUrl);

  let resolvedSortOrder = Number(sortOrder);
  if (!Number.isFinite(resolvedSortOrder)) {
    const lastPromotion = await Promotion.findOne().sort({ sortOrder: -1 }).select('sortOrder');
    resolvedSortOrder = lastPromotion ? lastPromotion.sortOrder + 1 : 0;
  }

  const promotion = await Promotion.create({
    title,
    subtitle: subtitle || '',
    imageUrl: parsedImage ? '' : imageUrl || '',
    imageData: parsedImage ? parsedImage.base64 : '',
    imageContentType: parsedImage ? parsedImage.contentType : '',
    ctaLabel: ctaLabel || '',
    ctaLink: resolvedCtaType === 'combo' ? '' : ctaLink || '',
    ctaType: resolvedCtaType,
    comboItems: resolvedCtaType === 'combo' ? comboItems : [],
    comboDiscountPercent: resolvedCtaType === 'combo' ? Number(comboDiscountPercent) || 0 : 0,
    isActive: isActive === undefined ? true : Boolean(isActive),
    sortOrder: resolvedSortOrder,
  });

  await promotion.populate('comboItems.menuItem', 'name');
  notifyPromotionsChanged(req);
  res.status(201).json({ promotion: serializePromotion(req, promotion) });
});

const updatePromotion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const promotion = await Promotion.findById(id);

  if (!promotion) {
    res.status(404);
    throw new Error('Promotion not found');
  }

  const fields = ['title', 'subtitle', 'ctaLabel', 'ctaLink'];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      promotion[field] = req.body[field];
    }
  });

  if (req.body.ctaType !== undefined) {
    promotion.ctaType = req.body.ctaType === 'combo' ? 'combo' : 'link';
    if (promotion.ctaType === 'link') {
      promotion.comboItems = [];
      promotion.comboDiscountPercent = 0;
    } else {
      promotion.ctaLink = '';
    }
  }

  if (promotion.ctaType === 'combo') {
    if (req.body.comboItems !== undefined) {
      if (!Array.isArray(req.body.comboItems) || req.body.comboItems.length === 0) {
        res.status(400);
        throw new Error('Combo deals require at least one selected menu item');
      }
      promotion.comboItems = req.body.comboItems;
    }
    if (req.body.comboDiscountPercent !== undefined) {
      promotion.comboDiscountPercent = Number(req.body.comboDiscountPercent) || 0;
    }
  }

  if (req.body.isActive !== undefined) {
    promotion.isActive = Boolean(req.body.isActive);
  }

  if (req.body.sortOrder !== undefined) {
    promotion.sortOrder = Number(req.body.sortOrder) || 0;
  }

  if (req.body.imageUrl !== undefined) {
    const parsedImage = parseDataUrl(req.body.imageUrl);
    if (parsedImage) {
      promotion.imageData = parsedImage.base64;
      promotion.imageContentType = parsedImage.contentType;
      promotion.imageUrl = '';
    } else {
      promotion.imageData = '';
      promotion.imageContentType = '';
      promotion.imageUrl = req.body.imageUrl;
    }
  }

  await promotion.save();
  await promotion.populate('comboItems.menuItem', 'name');
  notifyPromotionsChanged(req);
  res.json({ promotion: serializePromotion(req, promotion) });
});

const deletePromotion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const promotion = await Promotion.findByIdAndDelete(id);

  if (!promotion) {
    res.status(404);
    throw new Error('Promotion not found');
  }

  notifyPromotionsChanged(req);
  res.json({ message: 'Promotion deleted' });
});

const reorderPromotions = asyncHandler(async (req, res) => {
  const { orderedIds } = req.body;

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    res.status(400);
    throw new Error('orderedIds must be a non-empty array');
  }

  await Promotion.bulkWrite(
    orderedIds.map((id, index) => ({
      updateOne: {
        filter: { _id: id },
        update: { $set: { sortOrder: index } },
      },
    }))
  );

  notifyPromotionsChanged(req);

  const promotions = await Promotion.find({}).sort({ sortOrder: 1, createdAt: 1 });
  res.json({ promotions: promotions.map((item) => serializePromotion(req, item)) });
});

module.exports = {
  listPromotions,
  listPromotionsAdmin,
  getPromotionImage,
  createPromotion,
  updatePromotion,
  deletePromotion,
  reorderPromotions,
};

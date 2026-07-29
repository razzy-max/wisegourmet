const HeroBackground = require('../models/HeroBackground');
const asyncHandler = require('../utils/asyncHandler');
const { parseDataUrl } = require('../utils/dataUrl');

const notifyHeroBackgroundChanged = (req) => {
  const io = req.app.get('io');
  if (io) {
    io.emit('hero-background:changed', { updatedAt: new Date().toISOString() });
  }
};

const buildImageUrl = (req, doc) =>
  doc?.imageContentType ? `${req.protocol}://${req.get('host')}/api/hero-background/image` : doc?.imageUrl || '';

const getHeroBackground = asyncHandler(async (req, res) => {
  const doc = await HeroBackground.findOne();
  res.json({ imageUrl: buildImageUrl(req, doc) });
});

const getHeroBackgroundImage = asyncHandler(async (req, res) => {
  const doc = await HeroBackground.findOne().select('+imageData imageContentType');

  if (!doc || !doc.imageData) {
    res.status(404);
    throw new Error('Image not found');
  }

  res.set({
    'Content-Type': doc.imageContentType || 'application/octet-stream',
    'Cache-Control': 'public, max-age=86400',
  });
  res.send(Buffer.from(doc.imageData, 'base64'));
});

const updateHeroBackground = asyncHandler(async (req, res) => {
  const { imageUrl } = req.body;
  let doc = await HeroBackground.findOne();
  if (!doc) {
    doc = new HeroBackground();
  }

  const parsedImage = parseDataUrl(imageUrl);
  if (parsedImage) {
    doc.imageData = parsedImage.base64;
    doc.imageContentType = parsedImage.contentType;
    doc.imageUrl = '';
  } else {
    doc.imageData = '';
    doc.imageContentType = '';
    doc.imageUrl = imageUrl || '';
  }

  await doc.save();
  notifyHeroBackgroundChanged(req);
  res.json({ imageUrl: buildImageUrl(req, doc) });
});

module.exports = {
  getHeroBackground,
  getHeroBackgroundImage,
  updateHeroBackground,
};

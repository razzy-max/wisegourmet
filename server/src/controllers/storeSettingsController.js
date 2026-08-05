const StoreSettings = require('../models/StoreSettings');
const asyncHandler = require('../utils/asyncHandler');
const { DEFAULT_STORE_NAME } = require('../utils/storeSettings');

const notifyStoreSettingsChanged = (req, storeName) => {
  const io = req.app.get('io');
  if (io) {
    io.emit('store-settings:changed', { storeName, updatedAt: new Date().toISOString() });
  }
};

const getStoreSettings = asyncHandler(async (_req, res) => {
  const doc = await StoreSettings.findOne();
  res.json({ storeName: doc?.storeName?.trim() || DEFAULT_STORE_NAME });
});

const updateStoreSettings = asyncHandler(async (req, res) => {
  const { storeName } = req.body;
  const trimmed = String(storeName || '').trim();

  if (!trimmed) {
    res.status(400);
    throw new Error('storeName is required');
  }

  if (trimmed.length > 60) {
    res.status(400);
    throw new Error('storeName must be 60 characters or fewer');
  }

  let doc = await StoreSettings.findOne();
  if (!doc) {
    doc = new StoreSettings();
  }

  doc.storeName = trimmed;
  await doc.save();

  notifyStoreSettingsChanged(req, doc.storeName);
  res.json({ storeName: doc.storeName });
});

module.exports = {
  getStoreSettings,
  updateStoreSettings,
};

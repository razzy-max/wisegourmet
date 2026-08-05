const StoreSettings = require('../models/StoreSettings');

const DEFAULT_STORE_NAME = 'Store Name';

const getStoreName = async () => {
  const settings = await StoreSettings.findOne().select('storeName').lean();
  const name = settings?.storeName?.trim();
  return name || DEFAULT_STORE_NAME;
};

module.exports = { getStoreName, DEFAULT_STORE_NAME };

require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const MenuItem = require('../models/MenuItem');
const { parseDataUrl } = require('./dataUrl');

const run = async () => {
  await connectDB();

  const items = await MenuItem.find({ imageUrl: { $regex: '^data:' } }).select('+imageData imageUrl');
  console.log(`Found ${items.length} menu item(s) with embedded base64 images.`);

  let migrated = 0;
  for (const item of items) {
    const parsed = parseDataUrl(item.imageUrl);
    if (!parsed) {
      continue;
    }

    item.imageData = parsed.base64;
    item.imageContentType = parsed.contentType;
    item.imageUrl = '';
    await item.save();
    migrated += 1;
    console.log(`Migrated "${item.name}" (${item._id})`);
  }

  console.log(`Done. Migrated ${migrated}/${items.length} item(s).`);
  await mongoose.connection.close();
};

run().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});

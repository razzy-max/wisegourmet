require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Branch = require('../models/Branch');
const Order = require('../models/Order');
const DeliveryZone = require('../models/DeliveryZone');

// One-off, idempotent backfill for the multi-branch rollout (Stage 1).
//
// Creates the two real Ekpoma branches, plus a neutral, customer-hidden
// "Legacy / Unassigned" branch used purely as the backfill target for every
// pre-existing Order/DeliveryZone row. We deliberately do NOT guess which of
// the two real branches produced any given historical order — there's no
// field anywhere in the current schema that records that, and per the
// approved plan, retroactively re-tagging historical orders isn't worth
// doing. The legacy branch exists so nothing breaks the moment these fields
// become meaningful, without fabricating history we don't actually have.
//
// User.branches is intentionally left untouched here — assigning real staff
// and rider accounts to their correct branch(es) is a manual admin-UI step
// (Stage 2), since nothing in today's data records who actually works where.
//
// Safe to re-run: every write is an upsert or an $exists:false-guarded
// updateMany, so running this twice is a no-op the second time.

const run = async () => {
  await connectDB();

  const poultryRoad = await Branch.findOneAndUpdate(
    { slug: 'ekpoma-poultry-road' },
    {
      $setOnInsert: {
        name: 'Ekpoma – Poultry Road Junction',
        slug: 'ekpoma-poultry-road',
        city: 'Ekpoma',
        isActive: true,
        sortOrder: 0,
      },
    },
    { upsert: true, new: true }
  );
  console.log(`Branch ready: ${poultryRoad.name} (${poultryRoad._id})`);

  const ihumudumuRoad = await Branch.findOneAndUpdate(
    { slug: 'ekpoma-ihumudumu-road' },
    {
      $setOnInsert: {
        name: 'Ekpoma – Ihumudumu Road',
        slug: 'ekpoma-ihumudumu-road',
        city: 'Ekpoma',
        isActive: true,
        sortOrder: 1,
      },
    },
    { upsert: true, new: true }
  );
  console.log(`Branch ready: ${ihumudumuRoad.name} (${ihumudumuRoad._id})`);

  const legacyBranch = await Branch.findOneAndUpdate(
    { slug: 'legacy-unassigned' },
    {
      $setOnInsert: {
        name: 'Unassigned (Legacy)',
        slug: 'legacy-unassigned',
        city: '',
        isActive: false, // never shown in the customer picker
        sortOrder: 999,
      },
    },
    { upsert: true, new: true }
  );
  console.log(`Branch ready: ${legacyBranch.name} (${legacyBranch._id}) — backfill target only, hidden from customers`);

  const orderResult = await Order.updateMany(
    { branch: { $exists: false } },
    { $set: { branch: legacyBranch._id } }
  );
  console.log(`Orders backfilled: ${orderResult.modifiedCount}`);

  // Existing zones also predate the branch field, and predate the
  // {branch,key} compound unique index — assigning them all to the same
  // legacy branch is safe here because their `key` values were already
  // unique business-wide (one shared list) before this change.
  const zoneResult = await DeliveryZone.updateMany(
    { branch: { $exists: false } },
    { $set: { branch: legacyBranch._id } }
  );
  console.log(`Delivery zones backfilled: ${zoneResult.modifiedCount}`);

  const remainingOrders = await Order.countDocuments({ branch: { $exists: false } });
  const remainingZones = await DeliveryZone.countDocuments({ branch: { $exists: false } });
  console.log(`Remaining unbackfilled — orders: ${remainingOrders}, zones: ${remainingZones}`);

  if (remainingOrders > 0 || remainingZones > 0) {
    throw new Error('Backfill incomplete — some documents still missing a branch.');
  }

  console.log('Backfill complete.');
  await mongoose.connection.close();
};

run().catch((error) => {
  console.error('Migration failed:', error.message);
  process.exit(1);
});

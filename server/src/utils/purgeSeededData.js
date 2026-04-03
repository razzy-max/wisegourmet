require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');
const Category = require('../models/Category');
const Order = require('../models/Order');
const SupportTicket = require('../models/SupportTicket');

const SEEDED_MENU_NAMES = [
  'Classic Beef Burger',
  'Chicken Shawarma Wrap',
  'Pepperoni Pizza (Medium)',
  'Chilled Soft Drink',
];

const SEEDED_SUPPORT_SUBJECTS = ['Food arrived late', 'Need help with payment receipt', 'Menu question'];

async function purge() {
  await mongoose.connect(process.env.MONGO_URI);

  const seededOrders = await Order.find({ 'payment.reference': /^demo-order-/ }, '_id');
  const seededOrderIds = seededOrders.map((order) => order._id);

  const menuResult = await MenuItem.deleteMany({
    $or: [{ slug: /-seed$/ }, { name: { $in: SEEDED_MENU_NAMES } }],
  });

  const orderResult = await Order.deleteMany({
    $or: [{ _id: { $in: seededOrderIds } }, { 'payment.reference': /^demo-order-/ }],
  });

  const supportResult = await SupportTicket.deleteMany({
    $or: [{ subject: { $in: SEEDED_SUPPORT_SUBJECTS } }, { order: { $in: seededOrderIds } }],
  });

  const menuCategoryIds = (await MenuItem.find({}, 'category')).map((item) => String(item.category)).filter(Boolean);
  const seededCategories = await Category.find({ slug: { $in: ['burger', 'shawarma', 'pizza', 'drinks'] } });
  let removedSeedCategories = 0;

  for (const category of seededCategories) {
    if (!menuCategoryIds.includes(String(category._id))) {
      await Category.deleteOne({ _id: category._id });
      removedSeedCategories += 1;
    }
  }

  const remainingSeedMenu = await MenuItem.find({
    $or: [{ slug: /-seed$/ }, { name: { $in: SEEDED_MENU_NAMES } }],
  })
    .select('name slug')
    .lean();

  const remainingSeedOrders = await Order.countDocuments({ 'payment.reference': /^demo-order-/ });
  const remainingSeedSupport = await SupportTicket.countDocuments({ subject: { $in: SEEDED_SUPPORT_SUBJECTS } });

  console.log(
    JSON.stringify(
      {
        deletedSeedMenuItems: menuResult.deletedCount,
        deletedSeedOrders: orderResult.deletedCount,
        deletedSeedSupportTickets: supportResult.deletedCount,
        deletedUnusedSeedCategories: removedSeedCategories,
        remainingSeedMenu,
        remainingSeedOrders,
        remainingSeedSupport,
      },
      null,
      2
    )
  );

  await mongoose.disconnect();
}

purge().catch(async (error) => {
  console.error(error.message);
  try {
    await mongoose.disconnect();
  } catch (_error) {
    // ignore disconnect failures in cleanup utility
  }
  process.exit(1);
});

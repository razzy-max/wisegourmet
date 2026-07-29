const User = require('../models/User');
const Order = require('../models/Order');

const getCustomersWithLastOrder = async (filter = { role: 'customer' }, select = 'fullName email phone isActive createdAt') => {
  const customers = await User.find(filter).select(select).lean();

  const orderStats = await Order.aggregate([
    { $group: { _id: '$customer', lastOrderAt: { $max: '$createdAt' }, orderCount: { $sum: 1 } } },
  ]);
  const statsByCustomerId = new Map(orderStats.map((stat) => [String(stat._id), stat]));

  return customers.map((customer) => {
    const stats = statsByCustomerId.get(String(customer._id));
    return {
      ...customer,
      lastOrderAt: stats?.lastOrderAt || null,
      orderCount: stats?.orderCount || 0,
    };
  });
};

module.exports = { getCustomersWithLastOrder };

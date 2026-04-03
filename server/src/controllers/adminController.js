const Order = require('../models/Order');
const SupportTicket = require('../models/SupportTicket');
const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const asyncHandler = require('../utils/asyncHandler');

const MS_IN_DAY = 24 * 60 * 60 * 1000;

const formatDateKey = (date) => {
  return new Date(date).toISOString().slice(0, 10);
};

const parseRange = (query) => {
  const now = new Date();
  const range = query.range || '7d';

  const startOfDay = (date) => {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);
    return copy;
  };

  const endOfDay = (date) => {
    const copy = new Date(date);
    copy.setHours(23, 59, 59, 999);
    return copy;
  };

  if (range === 'today') {
    return {
      range,
      startDate: startOfDay(now),
      endDate: endOfDay(now),
    };
  }

  if (range === '30d') {
    const endDate = endOfDay(now);
    const startDate = startOfDay(new Date(endDate.getTime() - 29 * MS_IN_DAY));
    return { range, startDate, endDate };
  }

  if (range === 'custom') {
    const startDate = query.startDate ? startOfDay(new Date(query.startDate)) : null;
    const endDate = query.endDate ? endOfDay(new Date(query.endDate)) : null;

    if (!startDate || !endDate || Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      const error = new Error('Valid startDate and endDate are required for custom range');
      error.statusCode = 400;
      throw error;
    }

    if (startDate > endDate) {
      const error = new Error('startDate must be less than or equal to endDate');
      error.statusCode = 400;
      throw error;
    }

    return { range, startDate, endDate };
  }

  const endDate = endOfDay(now);
  const startDate = startOfDay(new Date(endDate.getTime() - 6 * MS_IN_DAY));
  return { range: '7d', startDate, endDate };
};

const average = (numbers) => {
  if (!numbers.length) return 0;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
};

const getTimelineTime = (order, status) => {
  const entry = (order.statusTimeline || []).find((timelineItem) => timelineItem.status === status);
  return entry ? new Date(entry.changedAt).getTime() : null;
};

const getOverviewStats = asyncHandler(async (req, res) => {
  const { range, startDate, endDate } = parseRange(req.query);

  const periodOrders = await Order.find({
    createdAt: { $gte: startDate, $lte: endDate },
  }).lean();

  const paidOrders = periodOrders.filter((order) => order.payment?.status === 'paid');
  const deliveredOrders = periodOrders.filter((order) => order.status === 'delivered');

  const revenue = paidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const subtotalRevenue = paidOrders.reduce((sum, order) => sum + Number(order.subtotal || 0), 0);
  const deliveryFeeRevenue = paidOrders.reduce((sum, order) => sum + Number(order.deliveryFee || 0), 0);
  const ordersCount = periodOrders.length;
  const paidOrdersCount = paidOrders.length;
  const deliveredCount = deliveredOrders.length;
  const cancelledCount = periodOrders.filter((order) => order.status === 'cancelled').length;

  const itemsSold = paidOrders.reduce(
    (sum, order) => sum + (order.items || []).reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0),
    0
  );

  const avgOrderValue = paidOrdersCount ? revenue / paidOrdersCount : 0;

  const statusBreakdown = periodOrders.reduce((accumulator, order) => {
    accumulator[order.status] = (accumulator[order.status] || 0) + 1;
    return accumulator;
  }, {});

  const trendMap = {};
  for (let cursor = startDate.getTime(); cursor <= endDate.getTime(); cursor += MS_IN_DAY) {
    const key = formatDateKey(cursor);
    trendMap[key] = { date: key, revenue: 0, orders: 0 };
  }

  paidOrders.forEach((order) => {
    const key = formatDateKey(order.createdAt);
    if (!trendMap[key]) {
      trendMap[key] = { date: key, revenue: 0, orders: 0 };
    }
    trendMap[key].revenue += Number(order.total || 0);
    trendMap[key].orders += 1;
  });

  const revenueTrend = Object.values(trendMap).sort((a, b) => a.date.localeCompare(b.date));

  const productMap = {};
  paidOrders.forEach((order) => {
    (order.items || []).forEach((item) => {
      const key = String(item.menuItem || item.name || 'unknown');
      if (!productMap[key]) {
        productMap[key] = {
          key,
          name: item.name || 'Unknown item',
          quantity: 0,
          revenue: 0,
        };
      }
      productMap[key].quantity += Number(item.quantity || 0);
      productMap[key].revenue += Number(item.price || 0) * Number(item.quantity || 0);
    });
  });

  const topProducts = Object.values(productMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  const prepMinutes = [];
  const deliveryMinutes = [];

  periodOrders.forEach((order) => {
    const confirmedAt = getTimelineTime(order, 'confirmed');
    const readyAt = getTimelineTime(order, 'ready_for_pickup');
    const pickedUpAt = getTimelineTime(order, 'picked_up');
    const deliveredAt = getTimelineTime(order, 'delivered');

    if (confirmedAt && readyAt && readyAt >= confirmedAt) {
      prepMinutes.push((readyAt - confirmedAt) / (1000 * 60));
    }

    if (pickedUpAt && deliveredAt && deliveredAt >= pickedUpAt) {
      deliveryMinutes.push((deliveredAt - pickedUpAt) / (1000 * 60));
    }
  });

  const supportTickets = await SupportTicket.find({
    createdAt: { $gte: startDate, $lte: endDate },
  }).lean();

  const supportOpen = supportTickets.filter((ticket) => ticket.status !== 'resolved').length;
  const supportResolved = supportTickets.filter((ticket) => ticket.status === 'resolved').length;

  const resolutionMinutes = supportTickets
    .filter((ticket) => ticket.resolvedAt)
    .map((ticket) => (new Date(ticket.resolvedAt).getTime() - new Date(ticket.createdAt).getTime()) / (1000 * 60));

  const csatRatings = supportTickets
    .map((ticket) => Number(ticket.csatRating || 0))
    .filter((rating) => rating > 0);

  const durationMs = endDate.getTime() - startDate.getTime() + 1;
  const previousStartDate = new Date(startDate.getTime() - durationMs);
  const previousEndDate = new Date(startDate.getTime() - 1);

  const previousPaidOrders = await Order.find({
    createdAt: { $gte: previousStartDate, $lte: previousEndDate },
    'payment.status': 'paid',
  })
    .select('total')
    .lean();

  const previousRevenue = previousPaidOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const previousPaidCount = previousPaidOrders.length;

  const revenueGrowthPct = previousRevenue === 0 ? null : ((revenue - previousRevenue) / previousRevenue) * 100;
  const paidOrderGrowthPct = previousPaidCount === 0 ? null : ((paidOrdersCount - previousPaidCount) / previousPaidCount) * 100;

  res.json({
    meta: {
      range,
      startDate,
      endDate,
      previousStartDate,
      previousEndDate,
    },
    summary: {
      ordersCount,
      paidOrdersCount,
      deliveredCount,
      cancelledCount,
      itemsSold,
      revenue,
      subtotalRevenue,
      deliveryFeeRevenue,
      avgOrderValue,
      revenueGrowthPct,
      paidOrderGrowthPct,
    },
    charts: {
      revenueTrend,
      statusBreakdown,
      topProducts,
    },
    operations: {
      avgPrepMinutes: average(prepMinutes),
      avgDeliveryMinutes: average(deliveryMinutes),
    },
    support: {
      totalTickets: supportTickets.length,
      openTickets: supportOpen,
      resolvedTickets: supportResolved,
      avgResolutionMinutes: average(resolutionMinutes),
      avgCsat: average(csatRatings),
      csatResponses: csatRatings.length,
    },
  });
});

const purgeSeededData = asyncHandler(async (_req, res) => {
  const seededMenuNames = [
    'Classic Beef Burger',
    'Chicken Shawarma Wrap',
    'Pepperoni Pizza (Medium)',
    'Chilled Soft Drink',
  ];
  const seededSupportSubjects = ['Food arrived late', 'Need help with payment receipt', 'Menu question'];

  const seededOrders = await Order.find({ 'payment.reference': /^demo-order-/ }, '_id').lean();
  const seededOrderIds = seededOrders.map((order) => order._id);

  const menuResult = await MenuItem.deleteMany({
    $or: [{ slug: /-seed$/ }, { name: { $in: seededMenuNames } }],
  });

  const orderResult = await Order.deleteMany({
    $or: [{ _id: { $in: seededOrderIds } }, { 'payment.reference': /^demo-order-/ }],
  });

  const supportResult = await SupportTicket.deleteMany({
    $or: [{ subject: { $in: seededSupportSubjects } }, { order: { $in: seededOrderIds } }],
  });

  const activeCategoryIds = (await MenuItem.find({}, 'category').lean())
    .map((item) => String(item.category))
    .filter(Boolean);
  const seededCategories = await Category.find({ slug: { $in: ['burger', 'shawarma', 'pizza', 'drinks'] } }).lean();

  let deletedSeedCategories = 0;
  for (const category of seededCategories) {
    if (!activeCategoryIds.includes(String(category._id))) {
      await Category.deleteOne({ _id: category._id });
      deletedSeedCategories += 1;
    }
  }

  res.json({
    ok: true,
    deletedSeedMenuItems: menuResult.deletedCount || 0,
    deletedSeedOrders: orderResult.deletedCount || 0,
    deletedSeedSupportTickets: supportResult.deletedCount || 0,
    deletedSeedCategories,
  });
});

module.exports = {
  getOverviewStats,
  purgeSeededData,
};

const Category = require('../models/Category');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const { ORDER_STATUS } = require('./orderStatus');
const slugify = require('./slugify');

async function ensureDemoData() {
  const categoryNames = ['Burger', 'Shawarma', 'Pizza', 'Drinks'];
  const categories = {};

  for (const name of categoryNames) {
    const slug = slugify(name);
    const category = await Category.findOneAndUpdate(
      { slug },
      { name, slug, isActive: true },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    categories[name] = category;
  }

  const samples = [
    {
      name: 'Classic Beef Burger',
      description: 'Grilled beef patty, lettuce, tomato, house sauce.',
      category: categories.Burger._id,
      price: 4500,
      tags: ['burger', 'beef'],
      imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80',
    },
    {
      name: 'Chicken Shawarma Wrap',
      description: 'Spiced chicken, cabbage, onion, creamy garlic.',
      category: categories.Shawarma._id,
      price: 3500,
      tags: ['shawarma', 'chicken'],
      imageUrl: 'https://images.unsplash.com/photo-1604908554014-1f1d5b66f1d8?auto=format&fit=crop&w=1200&q=80',
    },
    {
      name: 'Pepperoni Pizza (Medium)',
      description: 'Stone-baked pizza with mozzarella and pepperoni.',
      category: categories.Pizza._id,
      price: 8000,
      tags: ['pizza'],
      imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=80',
    },
    {
      name: 'Chilled Soft Drink',
      description: '500ml assorted options.',
      category: categories.Drinks._id,
      price: 900,
      tags: ['drinks'],
      imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=1200&q=80',
    },
  ];

  for (const sample of samples) {
    const slug = slugify(sample.name);
    await MenuItem.findOneAndUpdate(
      { slug: new RegExp(`^${slug}`) },
      {
        ...sample,
        slug: `${slug}-seed`,
        isAvailable: true,
        availabilityStatus: 'in_stock',
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
  }

  const demoUsers = [
    { fullName: 'admin', email: 'admin@gmail.com', role: 'admin', phone: '08012341234', password: 'admin123' },
    { fullName: 'admin2', email: 'admin2@gmail.com', role: 'admin', phone: '08023412341', password: 'admin123' },
    { fullName: 'user', email: 'user@gmail.com', role: 'customer', phone: '08034123412', password: 'user123' },
    { fullName: 'user2', email: 'user2@gmail.com', role: 'customer', phone: '08045123412', password: 'user123' },
    { fullName: 'staff', email: 'staff@gmail.com', role: 'staff', phone: '08056123412', password: 'staff123' },
    { fullName: 'staff2', email: 'staff2@gmail.com', role: 'staff', phone: '08067123412', password: 'staff123' },
    { fullName: 'rider', email: 'rider@gmail.com', role: 'rider', phone: '08078123412', password: 'rider123' },
    { fullName: 'rider2', email: 'rider2@gmail.com', role: 'rider', phone: '08089123412', password: 'rider123' },
    { fullName: 'support', email: 'support@gmail.com', role: 'support', phone: '08090123412', password: 'support123' },
    { fullName: 'support2', email: 'support2@gmail.com', role: 'support', phone: '08001012341', password: 'support123' },
  ];

  for (const demoUser of demoUsers) {
    const email = demoUser.email.toLowerCase();
    const existing = await User.findOne({ email });

    if (!existing) {
      await User.create({
        fullName: demoUser.fullName,
        email,
        password: demoUser.password,
        role: demoUser.role,
        phone: demoUser.phone,
        isActive: true,
      });
      continue;
    }

    existing.fullName = demoUser.fullName;
    existing.password = demoUser.password;
    existing.role = demoUser.role;
    existing.phone = demoUser.phone;
    existing.isActive = true;
    await existing.save();
  }

  const orderCount = await Order.countDocuments();
  if (orderCount === 0) {
    const customers = await User.find({ role: 'customer' }).sort({ createdAt: 1 }).limit(2);
    const [customerOne, customerTwo] = customers;
    const burger = await MenuItem.findOne({ name: 'Classic Beef Burger' });
    const shawarma = await MenuItem.findOne({ name: 'Chicken Shawarma Wrap' });
    const pizza = await MenuItem.findOne({ name: 'Pepperoni Pizza (Medium)' });
    const drink = await MenuItem.findOne({ name: 'Chilled Soft Drink' });

    if (customerOne && customerTwo && burger && shawarma && pizza && drink) {
      const now = new Date();
      const hoursAgo = (hours) => new Date(now.getTime() - hours * 60 * 60 * 1000);

      await Order.create([
        {
          customer: customerOne._id,
          items: [
            { menuItem: burger._id, name: burger.name, price: burger.price, quantity: 2 },
            { menuItem: drink._id, name: drink.name, price: drink.price, quantity: 2 },
          ],
          subtotal: 10800,
          deliveryFee: 700,
          total: 11500,
          deliveryRule: { mode: 'zone', zone: 'zone_a', distanceKm: 0 },
          deliveryAddress: { fullText: '12 Demo Street, Lagos', area: 'Lekki', landmark: 'Demo Mall', notes: '' },
          payment: { provider: 'paystack', status: 'paid', reference: 'demo-order-001' },
          status: ORDER_STATUS.DELIVERED,
          statusTimeline: [
            { status: ORDER_STATUS.PENDING, changedAt: hoursAgo(18), note: 'Order placed' },
            { status: ORDER_STATUS.CONFIRMED, changedAt: hoursAgo(17), note: 'Confirmed by kitchen' },
            { status: ORDER_STATUS.PREPARING, changedAt: hoursAgo(16), note: 'Preparing order' },
            { status: ORDER_STATUS.READY_FOR_PICKUP, changedAt: hoursAgo(15.5), note: 'Ready for pickup' },
            { status: ORDER_STATUS.PICKED_UP, changedAt: hoursAgo(15), note: 'Picked up by rider' },
            { status: ORDER_STATUS.ON_THE_WAY, changedAt: hoursAgo(14.5), note: 'On the way' },
            { status: ORDER_STATUS.ARRIVED, changedAt: hoursAgo(14), note: 'Arrived at destination' },
            { status: ORDER_STATUS.DELIVERED, changedAt: hoursAgo(13.5), note: 'Delivered successfully' },
          ],
        },
        {
          customer: customerTwo._id,
          items: [{ menuItem: shawarma._id, name: shawarma.name, price: shawarma.price, quantity: 2 }],
          subtotal: 7000,
          deliveryFee: 1000,
          total: 8000,
          deliveryRule: { mode: 'zone', zone: 'zone_b', distanceKm: 0 },
          deliveryAddress: { fullText: '8 Demo Avenue, Lagos', area: 'Yaba', landmark: 'Demo Park', notes: '' },
          payment: { provider: 'paystack', status: 'paid', reference: 'demo-order-002' },
          status: ORDER_STATUS.DELIVERED,
          statusTimeline: [
            { status: ORDER_STATUS.PENDING, changedAt: hoursAgo(9), note: 'Order placed' },
            { status: ORDER_STATUS.CONFIRMED, changedAt: hoursAgo(8.5), note: 'Confirmed by kitchen' },
            { status: ORDER_STATUS.PREPARING, changedAt: hoursAgo(8), note: 'Preparing order' },
            { status: ORDER_STATUS.READY_FOR_PICKUP, changedAt: hoursAgo(7.5), note: 'Ready for pickup' },
            { status: ORDER_STATUS.PICKED_UP, changedAt: hoursAgo(7), note: 'Picked up by rider' },
            { status: ORDER_STATUS.ON_THE_WAY, changedAt: hoursAgo(6.5), note: 'On the way' },
            { status: ORDER_STATUS.ARRIVED, changedAt: hoursAgo(6), note: 'Arrived at destination' },
            { status: ORDER_STATUS.DELIVERED, changedAt: hoursAgo(5.5), note: 'Delivered successfully' },
          ],
        },
        {
          customer: customerOne._id,
          items: [{ menuItem: pizza._id, name: pizza.name, price: pizza.price, quantity: 1 }],
          subtotal: 8000,
          deliveryFee: 700,
          total: 8700,
          deliveryRule: { mode: 'zone', zone: 'zone_a', distanceKm: 0 },
          deliveryAddress: { fullText: '12 Demo Street, Lagos', area: 'Lekki', landmark: 'Demo Mall', notes: '' },
          payment: { provider: 'paystack', status: 'paid', reference: 'demo-order-003' },
          status: ORDER_STATUS.DELIVERED,
          statusTimeline: [
            { status: ORDER_STATUS.PENDING, changedAt: hoursAgo(4), note: 'Order placed' },
            { status: ORDER_STATUS.CONFIRMED, changedAt: hoursAgo(3.5), note: 'Confirmed by kitchen' },
            { status: ORDER_STATUS.PREPARING, changedAt: hoursAgo(3), note: 'Preparing order' },
            { status: ORDER_STATUS.READY_FOR_PICKUP, changedAt: hoursAgo(2.5), note: 'Ready for pickup' },
            { status: ORDER_STATUS.PICKED_UP, changedAt: hoursAgo(2), note: 'Picked up by rider' },
            { status: ORDER_STATUS.ON_THE_WAY, changedAt: hoursAgo(1.5), note: 'On the way' },
            { status: ORDER_STATUS.ARRIVED, changedAt: hoursAgo(1), note: 'Arrived at destination' },
            { status: ORDER_STATUS.DELIVERED, changedAt: hoursAgo(0.5), note: 'Delivered successfully' },
          ],
        },
        {
          customer: customerTwo._id,
          items: [{ menuItem: drink._id, name: drink.name, price: drink.price, quantity: 3 }],
          subtotal: 2700,
          deliveryFee: 1500,
          total: 4200,
          deliveryRule: { mode: 'distance', distanceKm: 12, zone: 'outside' },
          deliveryAddress: { fullText: '30 Demo Road, Lagos', area: 'Ikeja', landmark: 'Demo Gate', notes: '' },
          payment: { provider: 'paystack', status: 'paid', reference: 'demo-order-004' },
          status: ORDER_STATUS.DELIVERED,
          statusTimeline: [
            { status: ORDER_STATUS.PENDING, changedAt: hoursAgo(22), note: 'Order placed' },
            { status: ORDER_STATUS.CONFIRMED, changedAt: hoursAgo(21.5), note: 'Confirmed by kitchen' },
            { status: ORDER_STATUS.PREPARING, changedAt: hoursAgo(21), note: 'Preparing order' },
            { status: ORDER_STATUS.READY_FOR_PICKUP, changedAt: hoursAgo(20.5), note: 'Ready for pickup' },
            { status: ORDER_STATUS.PICKED_UP, changedAt: hoursAgo(20), note: 'Picked up by rider' },
            { status: ORDER_STATUS.ON_THE_WAY, changedAt: hoursAgo(19.2), note: 'On the way' },
            { status: ORDER_STATUS.ARRIVED, changedAt: hoursAgo(18.8), note: 'Arrived at destination' },
            { status: ORDER_STATUS.DELIVERED, changedAt: hoursAgo(18.3), note: 'Delivered successfully' },
          ],
        },
      ]);
    }
  }

  const supportCount = await SupportTicket.countDocuments();
  if (supportCount === 0) {
    const [customerOne, customerTwo] = await User.find({ role: 'customer' }).sort({ createdAt: 1 }).limit(2);
    const [adminUser, supportUser] = await User.find({ role: { $in: ['admin', 'support'] } }).sort({ createdAt: 1 }).limit(2);
    const sampleOrder = await Order.findOne().sort({ createdAt: -1 });

    if (customerOne && customerTwo) {
      const now = new Date();
      const createdAtOne = new Date(now.getTime() - 7 * 60 * 60 * 1000);
      const resolvedAtOne = new Date(now.getTime() - 5 * 60 * 60 * 1000);
      const createdAtTwo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      await SupportTicket.create([
        {
          customer: customerOne._id,
          order: sampleOrder ? sampleOrder._id : null,
          subject: 'Food arrived late',
          message: 'Order took longer than expected.',
          status: 'resolved',
          assignedTo: supportUser ? supportUser._id : adminUser ? adminUser._id : null,
          resolvedBy: supportUser ? supportUser._id : adminUser ? adminUser._id : null,
          resolvedAt: resolvedAtOne,
          reply: 'Sorry about that. We reviewed it and adjusted the rider timing.',
          messages: [
            { sender: customerOne._id, senderRole: 'customer', text: 'Food arrived late.', createdAt: createdAtOne },
            {
              sender: supportUser ? supportUser._id : adminUser ? adminUser._id : null,
              senderRole: supportUser ? 'support' : 'admin',
              text: 'Sorry about the delay. We have checked the delivery chain.',
              createdAt: resolvedAtOne,
            },
          ],
          csatRating: 5,
          csatComment: 'Issue resolved quickly.',
          csatSubmittedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        },
        {
          customer: customerTwo._id,
          order: sampleOrder ? sampleOrder._id : null,
          subject: 'Need help with payment receipt',
          message: 'I cannot find my payment proof.',
          status: 'open',
          assignedTo: adminUser ? adminUser._id : null,
          reply: '',
          messages: [
            { sender: customerTwo._id, senderRole: 'customer', text: 'I need help with my receipt.', createdAt: createdAtTwo },
          ],
        },
        {
          customer: customerOne._id,
          order: sampleOrder ? sampleOrder._id : null,
          subject: 'Menu question',
          message: 'Is the burger spicy?',
          status: 'resolved',
          assignedTo: supportUser ? supportUser._id : adminUser ? adminUser._id : null,
          resolvedBy: supportUser ? supportUser._id : adminUser ? adminUser._id : null,
          resolvedAt: new Date(now.getTime() - 90 * 60 * 1000),
          reply: 'It is mild, not spicy by default.',
          messages: [
            { sender: customerOne._id, senderRole: 'customer', text: 'Is the burger spicy?', createdAt: new Date(now.getTime() - 3 * 60 * 60 * 1000) },
            {
              sender: supportUser ? supportUser._id : adminUser ? adminUser._id : null,
              senderRole: supportUser ? 'support' : 'admin',
              text: 'It is mild by default, but you can request extra spice.',
              createdAt: new Date(now.getTime() - 90 * 60 * 1000),
            },
          ],
          csatRating: 4,
          csatComment: 'Helpful response.',
          csatSubmittedAt: new Date(now.getTime() - 80 * 60 * 1000),
        },
      ]);
    }
  }
}

module.exports = ensureDemoData;
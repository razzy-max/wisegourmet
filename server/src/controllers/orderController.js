const Cart = require('../models/Cart');
const Order = require('../models/Order');
const User = require('../models/User');
const DeliveryZone = require('../models/DeliveryZone');
const asyncHandler = require('../utils/asyncHandler');
const { calculateDeliveryFee, DEFAULT_ZONE_FEES } = require('../utils/deliveryFee');
const { ORDER_STATUS, canTransition } = require('../utils/orderStatus');

const STAFF_ALLOWED_STATUSES = new Set([
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PREPARING,
  ORDER_STATUS.READY_FOR_PICKUP,
  ORDER_STATUS.CANCELLED,
]);

const RIDER_ALLOWED_STATUSES = new Set([
  ORDER_STATUS.PICKED_UP,
  ORDER_STATUS.ON_THE_WAY,
  ORDER_STATUS.ARRIVED,
  ORDER_STATUS.DELIVERED,
]);

const isInStock = (menuItem) => {
  if (menuItem.availabilityStatus) {
    return menuItem.availabilityStatus === 'in_stock';
  }
  return menuItem.isAvailable;
};

const notifyOrderChanged = (req, order) => {
  const io = req.app.get('io');
  if (!io || !order?._id) {
    return;
  }

  const payload = {
    orderId: String(order._id),
    status: order.status,
    updatedAt: new Date().toISOString(),
  };

  io.emit('orders:changed', payload);
  io.to(`order:${String(order._id)}`).emit('order:changed', payload);
};

const getZoneFeeMap = async () => {
  const zones = await DeliveryZone.find({ isActive: true }).sort({ sortOrder: 1, label: 1 }).lean();

  if (!zones.length) {
    return DEFAULT_ZONE_FEES;
  }

  return zones.reduce((accumulator, zone) => {
    accumulator[zone.key] = Number(zone.fee || 0);
    return accumulator;
  }, {});
};

const getDeliveryZones = asyncHandler(async (_req, res) => {
  const zones = await DeliveryZone.find({ isActive: true })
    .sort({ sortOrder: 1, label: 1 })
    .select('key label fee sortOrder')
    .lean();

  if (zones.length) {
    res.json({ zones });
    return;
  }

  const fallback = Object.entries(DEFAULT_ZONE_FEES).map(([key, fee], index) => ({
    key,
    label: key.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
    fee,
    sortOrder: index,
  }));

  res.json({ zones: fallback });
});

const createOrderFromCart = asyncHandler(async (req, res) => {
  const {
    fulfillmentType = 'delivery',
    deliveryAddress,
    deliveryMode = 'zone',
    zone = 'outside',
    distanceKm = 0,
  } = req.body;

  if (!['delivery', 'self_pickup'].includes(fulfillmentType)) {
    res.status(400);
    throw new Error('Invalid fulfillmentType. Use delivery or self_pickup');
  }

  if (fulfillmentType === 'delivery' && (!deliveryAddress || !deliveryAddress.fullText)) {
    res.status(400);
    throw new Error('deliveryAddress.fullText is required for delivery orders');
  }

  const cart = await Cart.findOne({ user: req.user._id }).populate(
    'items.menuItem',
    'name price isAvailable availabilityStatus'
  );

  if (!cart || cart.items.length === 0) {
    res.status(400);
    throw new Error('Cart is empty');
  }

  const hasUnavailable = cart.items.some((item) => !item.menuItem || !isInStock(item.menuItem));
  if (hasUnavailable) {
    res.status(400);
    throw new Error('One or more cart items are unavailable');
  }

  const items = cart.items.map((item) => ({
    menuItem: item.menuItem._id,
    name: item.nameSnapshot,
    price: item.priceSnapshot,
    quantity: item.quantity,
  }));

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let feeResult = {
    fee: 0,
    appliedRule: {
      mode: 'zone',
      zone: 'self_pickup',
      distanceKm: 0,
    },
  };

  if (fulfillmentType === 'delivery') {
    const zoneFeeMap = await getZoneFeeMap();
    feeResult = calculateDeliveryFee({
      mode: deliveryMode,
      zone,
      distanceKm: Number(distanceKm),
      zoneFees: zoneFeeMap,
    });
  }

  const total = subtotal + Number(feeResult.fee || 0);

  // Generate random PIN for delivery verification
  const deliveryPin = Math.floor(1000 + Math.random() * 9000).toString();

  const order = await Order.create({
    customer: req.user._id,
    items,
    subtotal,
    deliveryFee: feeResult.fee,
    total,
    fulfillmentType,
    deliveryRule: {
      mode: feeResult.appliedRule.mode,
      zone: feeResult.appliedRule.zone || 'outside',
      distanceKm: feeResult.appliedRule.distanceKm || Number(distanceKm) || 0,
    },
    deliveryAddress: {
      fullText:
        fulfillmentType === 'delivery'
          ? deliveryAddress.fullText
          : 'Self pickup at Wise Gourmet kitchen',
      area: fulfillmentType === 'delivery' ? deliveryAddress.area || '' : '',
      landmark: fulfillmentType === 'delivery' ? deliveryAddress.landmark || '' : '',
      notes: fulfillmentType === 'delivery' ? deliveryAddress.notes || '' : '',
      lat: fulfillmentType === 'delivery' ? deliveryAddress.lat ?? null : null,
      lng: fulfillmentType === 'delivery' ? deliveryAddress.lng ?? null : null,
    },
    payment: {
      provider: 'paystack',
      status: 'pending',
      reference: '',
    },
    status: ORDER_STATUS.PENDING,
    kitchenHandledBy: null,
    deliveryPin,
    statusTimeline: [{ status: ORDER_STATUS.PENDING, changedBy: req.user._id, note: 'Order placed' }],
  });

  cart.items = [];
  await cart.save();

  const hydrated = await Order.findById(order._id)
    .populate('customer', 'fullName email phone role')
    .populate('kitchenHandledBy', 'fullName email phone role')
    .populate('statusTimeline.changedBy', 'fullName role');

  notifyOrderChanged(req, hydrated);

  res.status(201).json({ order: hydrated });
});

const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ customer: req.user._id })
    .sort({ createdAt: -1 })
    .populate('kitchenHandledBy', 'fullName email phone role')
    .populate('statusTimeline.changedBy', 'fullName role');

  res.json({ orders });
});

const getOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const query = { _id: id };

  // Customers can only view their own orders; riders can only view assigned orders.
  if (req.user.role === 'customer') {
    query.customer = req.user._id;
  } else if (req.user.role === 'rider') {
    query.assignedRider = req.user._id;
  }

  const order = await Order.findOne(query)
    .populate('customer', 'fullName email phone')
    .populate('assignedRider', 'fullName phone')
    .populate('kitchenHandledBy', 'fullName phone')
    .populate('statusTimeline.changedBy', 'fullName role');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  res.json({ order });
});

const getAllOrders = asyncHandler(async (_req, res) => {
  const orders = await Order.find({})
    .sort({ createdAt: -1 })
    .populate('customer', 'fullName email phone role')
    .populate('assignedRider', 'fullName email role')
    .populate('kitchenHandledBy', 'fullName email phone role')
    .populate('statusTimeline.changedBy', 'fullName role');

  res.json({ orders });
});

const getRiderOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ assignedRider: req.user._id })
    .sort({ createdAt: -1 })
    .populate('customer', 'fullName email phone role')
    .populate('assignedRider', 'fullName email role')
    .populate('kitchenHandledBy', 'fullName email phone role')
    .populate('statusTimeline.changedBy', 'fullName role');

  res.json({ orders });
});

const getRiderQueue = asyncHandler(async (req, res) => {
  const orders = await Order.find({
    status: ORDER_STATUS.READY_FOR_PICKUP,
    fulfillmentType: 'delivery',
    $or: [{ assignedRider: null }, { assignedRider: req.user._id }],
  })
    .sort({ createdAt: -1 })
    .populate('customer', 'fullName email phone role')
    .populate('assignedRider', 'fullName email role')
    .populate('kitchenHandledBy', 'fullName email phone role')
    .populate('statusTimeline.changedBy', 'fullName role');

  res.json({ orders });
});

const acceptRiderOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await Order.findById(id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (order.status !== ORDER_STATUS.READY_FOR_PICKUP) {
      if (order.fulfillmentType !== 'delivery') {
        res.status(400);
        throw new Error('Self pickup orders cannot be accepted by riders');
      }

    res.status(400);
    throw new Error('This order is no longer available for pickup');
  }

  if (order.assignedRider && String(order.assignedRider) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Order already accepted by another rider');
  }

  order.assignedRider = req.user._id;
  order.status = ORDER_STATUS.PICKED_UP;
  order.statusTimeline.push({
    status: ORDER_STATUS.PICKED_UP,
    changedBy: req.user._id,
    note: 'Order accepted by rider',
  });

  await order.save();

  const hydrated = await Order.findById(order._id)
    .populate('customer', 'fullName email phone role')
    .populate('assignedRider', 'fullName email role')
    .populate('kitchenHandledBy', 'fullName email phone role')
    .populate('statusTimeline.changedBy', 'fullName role');

  notifyOrderChanged(req, hydrated);

  res.json({ order: hydrated });
});

const assignRider = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { riderId } = req.body;

  if (!riderId) {
    res.status(400);
    throw new Error('riderId is required');
  }

  const order = await Order.findById(id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  const rider = await User.findOne({ _id: riderId, role: 'rider', isActive: true });
  if (!rider) {
    res.status(400);
    throw new Error('Invalid rider account');
  }

  order.assignedRider = rider._id;
  order.statusTimeline.push({
    status: order.status,
    changedBy: req.user._id,
    note: `Rider assigned: ${rider.fullName}`,
  });
  await order.save();

  const hydrated = await Order.findById(order._id)
    .populate('customer', 'fullName email phone role')
    .populate('assignedRider', 'fullName email role')
    .populate('kitchenHandledBy', 'fullName email phone role')
    .populate('statusTimeline.changedBy', 'fullName role');

  notifyOrderChanged(req, hydrated);

  res.json({ order: hydrated });
});

const initiatePayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const order = await Order.findOne({ _id: id, customer: req.user._id }).populate('customer', 'email');

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (order.payment.status === 'paid') {
    res.status(400);
    throw new Error('Order is already paid');
  }

  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  let authorizationUrl = null;
  let reference = null;

  // Use real Paystack API if secret key is configured
  if (paystackSecretKey && paystackSecretKey !== 'test_paystack_key') {
    try {
        const callbackUrl = `${frontendUrl}/checkout?orderId=${id}`;
      
      const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${paystackSecretKey}`,
        },
        body: JSON.stringify({
          email: order.customer.email,
          amount: (order.totalAmount || order.total || 0) * 100, // Paystack expects amount in kobo
          callback_url: callbackUrl,
          metadata: {
            orderId: order._id,
            deliveryPin: order.deliveryPin,
          },
        }),
      });

      const paystackJson = await paystackRes.json();
      if (paystackJson.status && paystackJson.data) {
        reference = paystackJson.data.reference;
        authorizationUrl = paystackJson.data.authorization_url;
      } else {
        throw new Error('Paystack API error');
      }
    } catch (err) {
      console.error('Paystack API error:', err.message);
      res.status(500);
      throw new Error('Failed to initialize Paystack payment');
    }
  } else {
    // Demo mode: generate fake reference and construct demo URL
    reference = `WG-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    authorizationUrl = `${frontendUrl}/checkout?reference=${reference}&orderId=${id}`;
  }

  order.payment.reference = reference;
  order.payment.status = 'pending';
  await order.save();

  res.json({
    payment: {
      provider: 'paystack',
      reference,
      authorizationUrl,
      amount: order.totalAmount || order.total,
    },
  });
});

const verifyPayment = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reference } = req.body;
  const order = await Order.findOne({ _id: id, customer: req.user._id });

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (!reference || order.payment.reference !== reference) {
    res.status(400);
    throw new Error('Invalid payment reference');
  }

  // Verify with Paystack API for real transaction
  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY;
  let isVerified = false;
  let paystackData = null;

  if (paystackSecretKey && paystackSecretKey !== 'test_paystack_key') {
    try {
      const paystackRes = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${paystackSecretKey}`,
        },
      });
      const paystackJson = await paystackRes.json();
      isVerified = paystackJson.status === true && paystackJson.data.status === 'success';
      paystackData = paystackJson.data;
    } catch (err) {
      console.error('Paystack API verify error:', err.message);
      // Fall through to demo mode
    }
  }

  // If Paystack verification fails or no key, operate in demo mode (for dev/test)
  if (!isVerified && (!paystackSecretKey || paystackSecretKey === 'test_paystack_key')) {
    isVerified = true; // Demo mode
  }

  if (!isVerified) {
    res.status(400);
    throw new Error('Payment verification failed. Please try again.');
  }

  order.payment.status = 'paid';
  order.payment.reference = reference;
  if (paystackData) {
    order.payment.metadata = {
      paystackReference: paystackData.reference,
      amount: paystackData.amount,
      paidAt: paystackData.paid_at,
    };
  }

  if (order.status === ORDER_STATUS.PENDING && canTransition(order.status, ORDER_STATUS.CONFIRMED)) {
    order.status = ORDER_STATUS.CONFIRMED;
    order.statusTimeline.push({
      status: ORDER_STATUS.CONFIRMED,
      changedBy: req.user._id,
      note: 'Payment verified',
    });
  }

  await order.save();

  const hydrated = await Order.findById(order._id)
    .populate('customer', 'fullName email phone role')
    .populate('assignedRider', 'fullName email role')
    .populate('kitchenHandledBy', 'fullName email phone role')
    .populate('statusTimeline.changedBy', 'fullName role');

  notifyOrderChanged(req, hydrated);

  res.json({ order: hydrated });
});

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, note = '' } = req.body;

  if (!status) {
    res.status(400);
    throw new Error('status is required');
  }

  const order = await Order.findById(id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (!canTransition(order.status, status)) {
    res.status(400);
    throw new Error(`Invalid status transition from ${order.status} to ${status}`);
  }

  if (req.user.role === 'rider') {
    if (!order.assignedRider || String(order.assignedRider) !== String(req.user._id)) {
      res.status(403);
      throw new Error('Rider can only update assigned orders');
    }

    if (!RIDER_ALLOWED_STATUSES.has(status)) {
      res.status(403);
      throw new Error('Rider is not allowed to set this status');
    }
  }

  if (req.user.role === 'admin' || req.user.role === 'staff') {
    if (!STAFF_ALLOWED_STATUSES.has(status) && status !== ORDER_STATUS.CANCELLED) {
      res.status(403);
      throw new Error('Admin/staff is not allowed to set this status directly');
    }

    if (req.user.role === 'staff') {
      if (order.kitchenHandledBy && String(order.kitchenHandledBy) !== String(req.user._id)) {
        res.status(403);
        throw new Error('This order is already being handled by another staff member');
      }

      if (!order.kitchenHandledBy && [ORDER_STATUS.PREPARING, ORDER_STATUS.READY_FOR_PICKUP].includes(status)) {
        order.kitchenHandledBy = req.user._id;
      }
    }
  }

  order.status = status;
  order.statusTimeline.push({
    status,
    changedBy: req.user._id,
    note,
  });

  await order.save();

  const hydrated = await Order.findById(order._id)
    .populate('customer', 'fullName email phone role')
    .populate('assignedRider', 'fullName email role')
    .populate('kitchenHandledBy', 'fullName email phone role')
    .populate('statusTimeline.changedBy', 'fullName role');

  notifyOrderChanged(req, hydrated);

  res.json({ order: hydrated });
});

const verifyDeliveryPin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { pin } = req.body;

  if (!pin) {
    res.status(400);
    throw new Error('PIN is required');
  }

  const order = await Order.findById(id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (order.status !== ORDER_STATUS.ARRIVED) {
    res.status(400);
    throw new Error('Order must be in arrived status to verify PIN');
  }

  if (!order.assignedRider || String(order.assignedRider) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Only the assigned rider can verify delivery PIN');
  }

  if (String(pin) !== String(order.deliveryPin)) {
    res.status(401);
    throw new Error('Invalid PIN');
  }

  // PIN verified, mark as delivered
  order.status = ORDER_STATUS.DELIVERED;
  order.statusTimeline.push({
    status: ORDER_STATUS.DELIVERED,
    changedBy: req.user._id,
    note: 'Delivery verified with PIN',
  });

  await order.save();

  const hydrated = await Order.findById(order._id)
    .populate('customer', 'fullName email phone role')
    .populate('assignedRider', 'fullName email role')
    .populate('kitchenHandledBy', 'fullName email phone role')
    .populate('statusTimeline.changedBy', 'fullName role');

  notifyOrderChanged(req, hydrated);

  res.json({ order: hydrated });
});

const verifySelfPickupPin = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { pin } = req.body;

  if (!pin) {
    res.status(400);
    throw new Error('Pickup PIN is required');
  }

  const order = await Order.findById(id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (order.fulfillmentType !== 'self_pickup') {
    res.status(400);
    throw new Error('This order is not a self pickup order');
  }

  if (order.status !== ORDER_STATUS.READY_FOR_PICKUP) {
    res.status(400);
    throw new Error('Order must be ready for pickup before PIN verification');
  }

  if (req.user.role === 'staff') {
    if (order.kitchenHandledBy && String(order.kitchenHandledBy) !== String(req.user._id)) {
      res.status(403);
      throw new Error('This order is already being handled by another staff member');
    }

    if (!order.kitchenHandledBy) {
      order.kitchenHandledBy = req.user._id;
    }
  }

  if (String(pin).trim() !== String(order.deliveryPin || '').trim()) {
    res.status(401);
    throw new Error('Invalid pickup PIN');
  }

  order.status = ORDER_STATUS.PICKED_UP;
  order.statusTimeline.push({
    status: ORDER_STATUS.PICKED_UP,
    changedBy: req.user._id,
    note: 'Self pickup verified with PIN at kitchen counter',
  });

  await order.save();

  const hydrated = await Order.findById(order._id)
    .populate('customer', 'fullName email phone role')
    .populate('assignedRider', 'fullName email role')
    .populate('kitchenHandledBy', 'fullName email phone role')
    .populate('statusTimeline.changedBy', 'fullName role');

  notifyOrderChanged(req, hydrated);

  res.json({ order: hydrated });
});

module.exports = {
  createOrderFromCart,
  getDeliveryZones,
  getMyOrders,
  getOrder,
  getAllOrders,
  getRiderOrders,
  getRiderQueue,
  acceptRiderOrder,
  assignRider,
  initiatePayment,
  verifyPayment,
  verifyDeliveryPin,
  verifySelfPickupPin,
  updateOrderStatus,
};

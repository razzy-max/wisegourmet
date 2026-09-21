const Cart = require('../models/Cart');
const Order = require('../models/Order');
const User = require('../models/User');
const Branch = require('../models/Branch');
const DeliveryZone = require('../models/DeliveryZone');
const PromoCode = require('../models/PromoCode');
const asyncHandler = require('../utils/asyncHandler');
const { calculateDeliveryFee, DEFAULT_ZONE_FEES } = require('../utils/deliveryFee');
const { ORDER_STATUS, canTransition } = require('../utils/orderStatus');
const { sendPushToRoles, sendPushToUserIds } = require('../utils/pushNotifications');
const { reconcileCartDiscounts, computeCartDiscount } = require('../utils/cartDiscount');
const { validatePromoCodeEligibility } = require('../utils/promoCodeDiscount');
const { isBranchScopingEnabled } = require('../utils/branchScoping');
const { getFeasibleBranchIds, findRemovableConflicts } = require('../utils/branchAvailability');
const { sendEmail, wrapEmail, BRAND_ORANGE, BRAND_ORANGE_DARK } = require('../utils/email');

const buildOrderConfirmationEmail = (order) => {
  const itemRows = order.items
    .map(
      (item) => `
        <tr>
          <td style="padding:6px 0;font-size:14px;">${item.quantity} × ${item.name}</td>
          <td style="padding:6px 0 6px 12px;font-size:14px;text-align:right;white-space:nowrap;">₦${Number(item.price * item.quantity).toLocaleString()}</td>
        </tr>`
    )
    .join('');

  // Explicit column widths + left padding on the amount cell so the label
  // and the figure never render flush against each other (some clients
  // collapse a bare two-<td> row with no width split down to content
  // width, leaving "Total paid₦6,390" with no visible gap).
  const summaryRow = (label, amount, bold) => `
    <tr${bold ? ` style="border-top:1px solid #ece4d8;"` : ''}>
      <td width="65%" style="padding:${bold ? '8px' : '4px'} 0;font-size:14px;${bold ? `font-weight:bold;color:${BRAND_ORANGE_DARK};` : 'color:#6b6259;'}">${label}</td>
      <td width="35%" style="padding:${bold ? '8px' : '4px'} 0 ${bold ? '8px' : '4px'} 12px;font-size:${bold ? '16px' : '14px'};text-align:right;white-space:nowrap;${bold ? `font-weight:bold;color:${BRAND_ORANGE_DARK};` : 'color:#6b6259;'}">₦${Number(amount || 0).toLocaleString()}</td>
    </tr>`;

  const fulfillmentLine =
    order.fulfillmentType === 'self_pickup'
      ? `Self pickup${order.deliveryAddress?.fullText ? ` — ${order.deliveryAddress.fullText}` : ''}`
      : `Delivery — ${order.deliveryAddress?.fullText || ''}`;

  return wrapEmail(
    'Order confirmed — payment received',
    `<p style="font-size:15px;line-height:1.5;">Thanks for your order! We’ve received your payment and the kitchen has been notified.</p>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-top:1px solid #ece4d8;border-bottom:1px solid #ece4d8;padding:10px 0;">
       <tr><td colspan="2" style="padding:6px 0;font-size:13px;color:#6b6259;">Order #${String(order._id).slice(-6).toUpperCase()} &middot; Ref ${order.payment?.reference || ''}</td></tr>
       ${itemRows}
     </table>
     <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
       ${summaryRow('Subtotal', order.subtotal)}
       ${order.discount?.amount ? summaryRow('Discount', -order.discount.amount) : ''}
       ${order.fulfillmentType === 'delivery' ? summaryRow('Delivery fee', order.deliveryFee) : ''}
       ${summaryRow('Total paid', order.total, true)}
     </table>
     <p style="font-size:14px;margin-top:16px;">${fulfillmentLine}</p>
     ${order.deliveryPin ? `<p style="font-size:14px;">Delivery PIN: <b style="color:${BRAND_ORANGE};font-size:16px;">${order.deliveryPin}</b> — share this with your rider on arrival.</p>` : ''}`
  );
};

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

  if (isBranchScopingEnabled() && order.branch) {
    payload.branch = String(order.branch);
    // Kitchen staff for this branch, riders everywhere (they're not branch
    // restricted), admins, and the customer who placed it.
    io.to([`branch:${String(order.branch)}`, 'admins', 'riders', `customer:${String(order.customer)}`]).emit(
      'orders:changed',
      payload
    );
  } else {
    // Scoping off, or a legacy order with no branch — today's exact
    // behavior: everyone hears about every order.
    io.emit('orders:changed', payload);
  }

  io.to(`order:${String(order._id)}`).emit('order:changed', payload);
};

const getStatusLabel = (status) =>
  String(status || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

const getCustomerId = (order) => String(order?.customer?._id || order?.customer || '');

const sendCustomerStatusPush = async (order) => {
  const customerId = getCustomerId(order);
  if (!customerId || !order?._id) {
    return;
  }

  await sendPushToUserIds([customerId], {
    title: 'Order Status Updated',
    body: `Order #${String(order._id).slice(-6)} is now ${getStatusLabel(order.status)}.`,
    url: `/orders/${String(order._id)}`,
    tag: `order-status-${String(order._id)}`,
  });
};

// `branchId` is optional — no client sends one until the branch picker
// (multi-branch rollout Stage 4) is turned on, so omitting it preserves
// today's exact behavior: one shared zone list for the whole business.
const getZoneFeeMap = async (branchId = null) => {
  const filter = { isActive: true, ...(branchId ? { branch: branchId } : {}) };
  const zones = await DeliveryZone.find(filter).sort({ sortOrder: 1, label: 1 }).lean();

  if (!zones.length) {
    return DEFAULT_ZONE_FEES;
  }

  return zones.reduce((accumulator, zone) => {
    accumulator[zone.key] = Number(zone.fee || 0);
    return accumulator;
  }, {});
};

const getDeliveryZones = asyncHandler(async (req, res) => {
  const { branch } = req.query;

  // An explicit branch always wins (kept for completeness/future use —
  // no current customer call passes one).
  if (branch || !isBranchScopingEnabled()) {
    const filter = { isActive: true, ...(branch ? { branch } : {}) };
    const zones = await DeliveryZone.find(filter)
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
    return;
  }

  // Branching on, no explicit branch — resolve from the customer's own
  // cart: only branches that can supply everything in it are offered, so
  // whichever zone the customer picks unambiguously resolves a branch at
  // order-creation time.
  const cart = await Cart.findOne({ user: req.user._id }).populate('items.menuItem', '_id');
  const cartItemIds = (cart?.items || []).map((item) => String(item.menuItem?._id || item.menuItem));
  const feasibleBranchIds = await getFeasibleBranchIds(cartItemIds);

  const [zones, feasibleBranches] = await Promise.all([
    DeliveryZone.find({ isActive: true, branch: { $in: feasibleBranchIds } })
      .sort({ sortOrder: 1, label: 1 })
      .select('key label fee branch')
      .lean(),
    Branch.find({ _id: { $in: feasibleBranchIds } }).select('name').lean(),
  ]);

  // Merge by key, keeping the cheapest fee when the same zone exists at
  // more than one feasible branch — the customer just sees one zone list,
  // and order-creation independently resolves which branch actually fills
  // it (cheapest offering that zone) at checkout time. Relies on branch
  // admins naming zones consistently (same key/label) across branches.
  const zonesByKey = new Map();
  zones.forEach((zone) => {
    const existing = zonesByKey.get(zone.key);
    if (!existing || Number(zone.fee) < Number(existing.fee)) {
      zonesByKey.set(zone.key, { key: zone.key, label: zone.label, fee: zone.fee });
    }
  });

  res.json({
    zones: [...zonesByKey.values()].sort((a, b) => a.label.localeCompare(b.label)),
    feasibleBranches: feasibleBranches.map((b) => ({ _id: String(b._id), name: b.name })),
  });
});

const createOrderFromCart = asyncHandler(async (req, res) => {
  const {
    fulfillmentType = 'delivery',
    deliveryAddress,
    deliveryMode = 'zone',
    zone = 'outside',
    distanceKm = 0,
    branch = null,
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

  const cartItemIds = cart.items.map((item) => String(item.menuItem?._id));

  // Resolve which single branch fulfills this order. An explicit `branch`
  // (from the self-pickup "pick up from" selector, shown only when more
  // than one branch is feasible) always wins when branching is on.
  let branchDoc = null;

  if (isBranchScopingEnabled()) {
    const feasibleBranchIds = await getFeasibleBranchIds(cartItemIds);

    if (feasibleBranchIds.length === 0) {
      const culpritIds = await findRemovableConflicts(cartItemIds);
      const culpritNames = cart.items
        .filter((item) => culpritIds.includes(String(item.menuItem?._id)))
        .map((item) => item.nameSnapshot || item.menuItem?.name || 'an item');

      res.status(400);
      throw new Error(
        culpritNames.length
          ? `Your cart can't be fulfilled together anymore — ${culpritNames.join(' or ')} is no longer available with the rest. Please review your cart.`
          : 'One or more cart items are unavailable. Please review your cart.'
      );
    }

    if (fulfillmentType === 'self_pickup') {
      // The "pick up from" selector only appears (and sends `branch`) when
      // more than one branch is feasible — the customer needs to know
      // where to physically collect food, so branch identity surfaces here.
      if (branch) {
        if (!feasibleBranchIds.includes(String(branch))) {
          res.status(400);
          throw new Error('That branch can no longer fulfill your cart. Please revisit checkout.');
        }
        branchDoc = await Branch.findById(branch).select('name addressLine');
      } else if (feasibleBranchIds.length > 1) {
        res.status(400);
        throw new Error('Please choose which branch to pick up from.');
      } else {
        branchDoc = await Branch.findById(feasibleBranchIds[0]).select('name addressLine');
      }
    } else {
      // Delivery — the customer only ever picks a zone (merged across
      // feasible branches by key), never a branch, so resolve it here:
      // whichever feasible branch offers the chosen zone, cheapest if more
      // than one does. Recomputed as the source of truth rather than
      // trusting client state, since stock/zones could have changed since
      // the checkout page loaded.
      const zonesAtFeasibleBranches = await DeliveryZone.find({
        isActive: true,
        branch: { $in: feasibleBranchIds },
        key: zone,
      })
        .sort({ fee: 1 })
        .select('branch fee')
        .lean();

      if (!zonesAtFeasibleBranches.length) {
        res.status(400);
        throw new Error('That delivery zone is no longer available for your cart. Please revisit checkout.');
      }

      branchDoc = await Branch.findById(zonesAtFeasibleBranches[0].branch).select('name addressLine');
    }
  } else {
    // Branching off — today's exact original behavior, regardless of
    // whether a branch happens to be passed (an explicit branch is
    // accepted but purely informational here, kept for backward
    // compatibility / future use).
    const hasUnavailable = cart.items.some((item) => !item.menuItem || !isInStock(item.menuItem));
    if (hasUnavailable) {
      res.status(400);
      throw new Error('One or more cart items are unavailable');
    }

    if (branch) {
      branchDoc = await Branch.findById(branch).select('name addressLine');
    }
  }

  reconcileCartDiscounts(cart);

  if (cart.appliedPromoCode) {
    const cartSubtotal = cart.items.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0);
    const promoCode = await PromoCode.findById(cart.appliedPromoCode.promoCode);
    const eligibility = await validatePromoCodeEligibility(promoCode, req.user._id, cartSubtotal);
    if (!eligibility.valid) {
      res.status(400);
      throw new Error(`${eligibility.reason} Please remove it from your cart and try again.`);
    }
  }

  const { discountAmount } = computeCartDiscount(cart);

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
    const zoneFeeMap = await getZoneFeeMap(branchDoc?._id || null);
    feeResult = calculateDeliveryFee({
      mode: deliveryMode,
      zone,
      distanceKm: Number(distanceKm),
      zoneFees: zoneFeeMap,
    });
  }

  const total = subtotal - discountAmount + Number(feeResult.fee || 0);

  // Generate random PIN for delivery verification
  const deliveryPin = Math.floor(1000 + Math.random() * 9000).toString();

  const order = await Order.create({
    customer: req.user._id,
    branch: branchDoc?._id || null,
    items,
    subtotal,
    discount: (() => {
      if (cart.appliedPromoCode) {
        return {
          promoCode: cart.appliedPromoCode.promoCode,
          title: cart.appliedPromoCode.code,
          percent: cart.appliedPromoCode.discountType === 'percent' ? cart.appliedPromoCode.discountValue : 0,
          amount: discountAmount,
        };
      }
      if (cart.appliedPromotion) {
        return {
          promotion: cart.appliedPromotion.promotion,
          title: cart.appliedPromotion.title,
          percent: cart.appliedPromotion.discountPercent,
          amount: discountAmount,
        };
      }
      return null;
    })(),
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
          : branchDoc
            ? `Self pickup at ${branchDoc.name}${branchDoc.addressLine ? ` (${branchDoc.addressLine})` : ''}`
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
  cart.appliedPromotion = null;
  cart.appliedPromoCode = null;
  await cart.save();
  await User.updateOne({ _id: req.user._id }, { lastAutoReengagementSentAt: null });

  const hydrated = await Order.findById(order._id)
    .populate('customer', 'fullName email phone role')
    .populate('kitchenHandledBy', 'fullName email phone role')
    .populate('statusTimeline.changedBy', 'fullName role');

  notifyOrderChanged(req, hydrated);

  await sendPushToRoles(
    ['staff'],
    {
      title: 'New Order Placed',
      body: `Order #${String(order._id).slice(-6)} was placed and is awaiting processing.`,
      url: '/admin/orders',
      tag: `new-order-${String(order._id)}`,
    },
    isBranchScopingEnabled() && order.branch ? { branchId: String(order.branch) } : {}
  );

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
  } else if (isBranchScopingEnabled() && ['staff', 'branch_admin'].includes(req.user.role)) {
    query.branch = { $in: [...req.user.branches, null] };
  }

  const order = await Order.findOne(query)
    .populate('branch', 'name city addressLine')
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

const getAllOrders = asyncHandler(async (req, res) => {
  const query = {};

  if (isBranchScopingEnabled()) {
    if (['staff', 'branch_admin'].includes(req.user.role)) {
      // Kitchen work is location-bound — force-scoped regardless of any
      // client-supplied filter. A legacy/unassigned order (branch: null)
      // stays visible to everyone rather than silently vanishing.
      query.branch = { $in: [...req.user.branches, null] };
    } else if (req.user.role === 'admin' && req.query.branch) {
      query.branch = req.query.branch;
    }
  }

  const orders = await Order.find(query)
    .sort({ createdAt: -1 })
    .populate('branch', 'name city addressLine')
    .populate('customer', 'fullName email phone role')
    .populate('assignedRider', 'fullName email role')
    .populate('kitchenHandledBy', 'fullName email phone role')
    .populate('statusTimeline.changedBy', 'fullName role');

  res.json({ orders });
});

const getRiderOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ assignedRider: req.user._id })
    .sort({ createdAt: -1 })
    .populate('branch', 'name city addressLine')
    .populate('customer', 'fullName email phone role')
    .populate('assignedRider', 'fullName email role')
    .populate('kitchenHandledBy', 'fullName email phone role')
    .populate('statusTimeline.changedBy', 'fullName role');

  res.json({ orders });
});

const getRiderQueue = asyncHandler(async (req, res) => {
  // Deliberately no branch filter — a rider sees every branch's ready
  // orders and judges for themselves whether a given job is worth taking,
  // using the populated branch (pickup point) and delivery address
  // (drop-off) shown on each card.
  const orders = await Order.find({
    status: ORDER_STATUS.READY_FOR_PICKUP,
    fulfillmentType: 'delivery',
    $or: [{ assignedRider: null }, { assignedRider: req.user._id }],
  })
    .sort({ createdAt: -1 })
    .populate('branch', 'name city addressLine')
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

  await sendCustomerStatusPush(hydrated);

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

  if (
    isBranchScopingEnabled() &&
    ['staff', 'branch_admin'].includes(req.user.role) &&
    order.branch &&
    !req.user.branches.some((ownId) => String(ownId) === String(order.branch))
  ) {
    res.status(403);
    throw new Error('This order belongs to a different branch');
  }

  // Riders are never branch-restricted — any active rider can be assigned.
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

  await sendPushToUserIds([String(rider._id)], {
    title: 'New Delivery Assignment',
    body: `Order #${String(order._id).slice(-6)} was assigned to you.`,
    url: `/orders/${String(order._id)}`,
    tag: `rider-assigned-${String(order._id)}`,
  });

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

  const respondWithCurrentOrder = async () => {
    const current = await Order.findById(order._id)
      .populate('customer', 'fullName email phone role')
      .populate('assignedRider', 'fullName email role')
      .populate('kitchenHandledBy', 'fullName email phone role')
      .populate('statusTimeline.changedBy', 'fullName role');
    res.json({ order: current });
  };

  // A plain "if already paid, skip" read-then-write check can't close the
  // real race here: the Paystack callback page's effect can fire this
  // route twice almost simultaneously (StrictMode's double-invoke, a
  // fast page refresh, a mobile browser retry) — both requests read
  // 'pending' before either has saved, so both would proceed. Atomically
  // claim the order for processing instead: only one concurrent request
  // can flip status away from 'pending', so the loser sees no match here
  // and just returns the current state instead of re-running side effects.
  const claimed = await Order.findOneAndUpdate(
    { _id: order._id, customer: req.user._id, 'payment.reference': reference, 'payment.status': 'pending' },
    { $set: { 'payment.status': 'verifying' } },
    { returnDocument: 'after' }
  );

  if (!claimed) {
    await respondWithCurrentOrder();
    return;
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
    // Release the claim so a genuine retry (payment actually succeeds on a
    // later attempt) isn't permanently stuck at 'verifying'.
    await Order.updateOne({ _id: claimed._id, 'payment.status': 'verifying' }, { $set: { 'payment.status': 'pending' } });
    res.status(400);
    throw new Error('Payment verification failed. Please try again.');
  }

  claimed.payment.status = 'paid';
  claimed.payment.reference = reference;
  if (paystackData) {
    claimed.payment.metadata = {
      paystackReference: paystackData.reference,
      amount: paystackData.amount,
      paidAt: paystackData.paid_at,
    };
  }

  // A promo code only counts as "used" once its order is actually paid —
  // matches the same rule used for new-customer eligibility, so an
  // abandoned/never-paid order never burns a limited-use code.
  if (claimed.discount?.promoCode) {
    await PromoCode.updateOne({ _id: claimed.discount.promoCode }, { $inc: { usageCount: 1 } });
  }

  if (claimed.status === ORDER_STATUS.PENDING && canTransition(claimed.status, ORDER_STATUS.CONFIRMED)) {
    claimed.status = ORDER_STATUS.CONFIRMED;
    claimed.statusTimeline.push({
      status: ORDER_STATUS.CONFIRMED,
      changedBy: req.user._id,
      note: 'Payment verified',
    });
  }

  await claimed.save();

  const hydrated = await Order.findById(claimed._id)
    .populate('customer', 'fullName email phone role')
    .populate('assignedRider', 'fullName email role')
    .populate('kitchenHandledBy', 'fullName email phone role')
    .populate('statusTimeline.changedBy', 'fullName role');

  notifyOrderChanged(req, hydrated);

  if (hydrated.customer?.email) {
    await sendEmail({
      to: hydrated.customer.email,
      subject: `Order #${String(hydrated._id).slice(-6).toUpperCase()} confirmed — Wise Gourmet`,
      html: buildOrderConfirmationEmail(hydrated),
    });
  }

  await sendCustomerStatusPush(hydrated);

  await sendPushToRoles(
    ['staff'],
    {
      title: 'Order Confirmed and Paid',
      body: `Order #${String(order._id).slice(-6)} payment verified and ready for kitchen flow.`,
      url: '/staff/kitchen',
      tag: `order-confirmed-${String(order._id)}`,
    },
    isBranchScopingEnabled() && order.branch ? { branchId: String(order.branch) } : {}
  );

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

  if (['admin', 'staff', 'branch_admin'].includes(req.user.role)) {
    if (!STAFF_ALLOWED_STATUSES.has(status) && status !== ORDER_STATUS.CANCELLED) {
      res.status(403);
      throw new Error('Admin/staff is not allowed to set this status directly');
    }

    if (['staff', 'branch_admin'].includes(req.user.role)) {
      // Kitchen work is location-bound — can't touch another branch's order.
      if (
        isBranchScopingEnabled() &&
        order.branch &&
        !req.user.branches.some((ownId) => String(ownId) === String(order.branch))
      ) {
        res.status(403);
        throw new Error('This order belongs to a different branch');
      }

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

  await sendCustomerStatusPush(hydrated);

  if (status === ORDER_STATUS.READY_FOR_PICKUP && order.fulfillmentType === 'delivery') {
    await sendPushToRoles(['rider'], {
      title: 'Delivery Ready for Pickup',
      body: `Order #${String(order._id).slice(-6)} is ready for rider pickup.`,
      url: '/rider/queue',
      tag: `delivery-ready-${String(order._id)}`,
    });
  }

  res.json({ order: hydrated });
});

const cancelOrder = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const order = await Order.findOne({ _id: id, customer: req.user._id });
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Customers can only back out of an order before staff have started acting
  // on it and before payment has actually gone through — once either of
  // those happens, cancelling is a staff/admin decision, not the customer's.
  if (order.status !== ORDER_STATUS.PENDING || order.payment.status === 'paid') {
    res.status(400);
    throw new Error('This order can no longer be cancelled — it is already being processed or paid for.');
  }

  order.status = ORDER_STATUS.CANCELLED;
  order.statusTimeline.push({
    status: ORDER_STATUS.CANCELLED,
    changedBy: req.user._id,
    note: 'Cancelled by customer',
  });

  await order.save();

  const hydrated = await Order.findById(order._id)
    .populate('customer', 'fullName email phone role')
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

  await sendCustomerStatusPush(hydrated);

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

  if (['staff', 'branch_admin'].includes(req.user.role)) {
    if (
      isBranchScopingEnabled() &&
      order.branch &&
      !req.user.branches.some((ownId) => String(ownId) === String(order.branch))
    ) {
      res.status(403);
      throw new Error('This order belongs to a different branch');
    }

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

  await sendCustomerStatusPush(hydrated);

  res.json({ order: hydrated });
});

const TRACKABLE_STATUSES = new Set([ORDER_STATUS.ON_THE_WAY, ORDER_STATUS.ARRIVED]);

const updateOrderLocation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { lat, lng } = req.body;

  const latNum = Number(lat);
  const lngNum = Number(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
    res.status(400);
    throw new Error('lat and lng must be valid numbers');
  }

  const order = await Order.findById(id);
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  if (order.fulfillmentType !== 'delivery') {
    res.status(400);
    throw new Error('Location tracking is only available for delivery orders');
  }

  if (!TRACKABLE_STATUSES.has(order.status)) {
    res.status(400);
    throw new Error('Order is not currently in an active delivery window');
  }

  let role;
  if (order.assignedRider && String(order.assignedRider) === String(req.user._id)) {
    role = 'rider';
  } else if (String(order.customer) === String(req.user._id)) {
    role = 'customer';
  } else {
    res.status(403);
    throw new Error('Not authorized to update location for this order');
  }

  const updatedAt = new Date();
  const field = role === 'rider' ? 'riderLocation' : 'customerLocation';

  await Order.findByIdAndUpdate(id, {
    $set: {
      [`${field}.lat`]: latNum,
      [`${field}.lng`]: lngNum,
      [`${field}.updatedAt`]: updatedAt,
    },
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`order:${id}`).emit('order-location:changed', {
      orderId: id,
      role,
      lat: latNum,
      lng: lngNum,
      updatedAt: updatedAt.toISOString(),
    });
  }

  res.json({ ok: true });
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
  updateOrderLocation,
  cancelOrder,
};

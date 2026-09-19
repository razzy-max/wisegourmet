const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const connectDB = require('./src/config/db');
const Order = require('./src/models/Order');
const User = require('./src/models/User');
const { isBranchScopingEnabled, loadBranchScopingSetting } = require('./src/utils/branchScoping');
const authRoutes = require('./src/routes/authRoutes');
const menuRoutes = require('./src/routes/menuRoutes');
const cartRoutes = require('./src/routes/cartRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const userRoutes = require('./src/routes/userRoutes');
const supportRoutes = require('./src/routes/supportRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const promotionRoutes = require('./src/routes/promotionRoutes');
const promoCodeRoutes = require('./src/routes/promoCodeRoutes');
const heroBackgroundRoutes = require('./src/routes/heroBackgroundRoutes');
const branchRoutes = require('./src/routes/branchRoutes');
const { notFound, errorHandler } = require('./src/middleware/error');
const { startReengagementScheduler } = require('./src/utils/reengagementScheduler');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

app.use(cors({ origin: FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

const io = new Server(server, {
  cors: {
    origin: FRONTEND_URL,
    credentials: true,
  },
});

const emitLocationSnapshot = async (socket, orderId) => {
  try {
    const order = await Order.findById(orderId).select('riderLocation customerLocation');
    if (!order) return;

    const emitIfPresent = (role, location) => {
      if (Number.isFinite(location?.lat) && Number.isFinite(location?.lng)) {
        socket.emit('order-location:changed', {
          orderId,
          role,
          lat: location.lat,
          lng: location.lng,
          updatedAt: (location.updatedAt || new Date()).toISOString(),
        });
      }
    };

    emitIfPresent('rider', order.riderLocation);
    emitIfPresent('customer', order.customerLocation);
  } catch (error) {
    console.error('Failed to send location snapshot on watch:', error.message);
  }
};

// Scopes a socket to the rooms its account should hear about, so branch-
// scoped events (see notifyOrderChanged in orderController.js) reach the
// right people instead of everyone. A room list (not a single room) because
// staff/branch_admin could in principle cover more than one branch, and
// re-identifying (e.g. after login/logout on the same tab) must first leave
// whatever rooms the socket held before.
const applyIdentity = async (socket, token) => {
  (socket.data.rooms || []).forEach((room) => socket.leave(room));
  socket.data.rooms = [];
  socket.data.user = null;

  if (!isBranchScopingEnabled() || !token) {
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('role branches isActive');
    if (!user || !user.isActive) {
      return;
    }

    socket.data.user = { id: String(user._id), role: user.role };

    let rooms = [];
    if (user.role === 'admin') {
      rooms = ['admins'];
    } else if (user.role === 'rider') {
      // Riders aren't branch-restricted — they see every branch's activity
      // and judge for themselves whether to accept a given delivery.
      rooms = ['riders'];
    } else if (['staff', 'branch_admin'].includes(user.role)) {
      rooms = (user.branches || []).map((id) => `branch:${id}`);
    } else if (user.role === 'customer') {
      rooms = [`customer:${user._id}`];
    }
    // support: no extra room — support stays unscoped.

    rooms.forEach((room) => socket.join(room));
    socket.data.rooms = rooms;
  } catch (error) {
    // Invalid/expired token — treat as anonymous rather than crash the socket.
  }
};

io.on('connection', (socket) => {
  applyIdentity(socket, socket.handshake.auth?.token);
  socket.on('identify', (token) => applyIdentity(socket, token));
  socket.on('deidentify', () => applyIdentity(socket, null));

  socket.on('order:watch', (orderId) => {
    if (orderId) {
      socket.join(`order:${orderId}`);
      emitLocationSnapshot(socket, orderId);
    }
  });

  socket.on('order:unwatch', (orderId) => {
    if (orderId) {
      socket.leave(`order:${orderId}`);
    }
  });

  socket.on('support-ticket:watch', (ticketId) => {
    if (ticketId) {
      socket.join(`support-ticket:${ticketId}`);
    }
  });

  socket.on('support-ticket:unwatch', (ticketId) => {
    if (ticketId) {
      socket.leave(`support-ticket:${ticketId}`);
    }
  });
});

app.set('io', io);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'wise-gourmet-api',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/users', userRoutes);
app.use('/api/support', supportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/promotions', promotionRoutes);
app.use('/api/promo-codes', promoCodeRoutes);
app.use('/api/hero-background', heroBackgroundRoutes);
app.use('/api/branches', branchRoutes);

app.use(notFound);
app.use(errorHandler);

const start = async () => {
  try {
    await connectDB();
    await loadBranchScopingSetting();
    server.listen(PORT, () => {
      console.log(`Wise Gourmet API running on http://localhost:${PORT}`);
    });
    startReengagementScheduler();
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

start();

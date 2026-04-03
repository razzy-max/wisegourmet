const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { Server } = require('socket.io');
const connectDB = require('./src/config/db');
const authRoutes = require('./src/routes/authRoutes');
const menuRoutes = require('./src/routes/menuRoutes');
const cartRoutes = require('./src/routes/cartRoutes');
const orderRoutes = require('./src/routes/orderRoutes');
const userRoutes = require('./src/routes/userRoutes');
const supportRoutes = require('./src/routes/supportRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const { notFound, errorHandler } = require('./src/middleware/error');
const ensureDemoData = require('./src/utils/bootstrapDemoData');

dotenv.config();

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

io.on('connection', (socket) => {
  socket.on('order:watch', (orderId) => {
    if (orderId) {
      socket.join(`order:${orderId}`);
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

app.use(notFound);
app.use(errorHandler);

const start = async () => {
  try {
    await connectDB();
    await ensureDemoData();
    server.listen(PORT, () => {
      console.log(`Wise Gourmet API running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

start();

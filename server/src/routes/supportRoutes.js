const express = require('express');
const {
  createTicket,
  listMyTickets,
  listTickets,
  getTicket,
  addTicketMessage,
  updateTicket,
  rateTicket,
} = require('../controllers/supportController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/tickets', protect, authorize('customer'), createTicket);
router.get('/tickets/my', protect, authorize('customer'), listMyTickets);
router.get('/tickets', protect, authorize('support', 'admin'), listTickets);
router.get('/tickets/:id', protect, authorize('customer', 'support', 'admin'), getTicket);
router.post('/tickets/:id/messages', protect, authorize('customer', 'support', 'admin'), addTicketMessage);
router.patch('/tickets/:id', protect, authorize('support', 'admin'), updateTicket);
router.post('/tickets/:id/rating', protect, authorize('customer'), rateTicket);

module.exports = router;

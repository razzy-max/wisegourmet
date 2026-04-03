const SupportTicket = require('../models/SupportTicket');
const asyncHandler = require('../utils/asyncHandler');

const populateTicket = (query) => {
  return query
    .populate('customer', 'fullName email phone role')
    .populate('order', '_id status total')
    .populate('assignedTo', 'fullName email role phone')
    .populate('resolvedBy', 'fullName email role phone')
    .populate('messages.sender', 'fullName email phone role');
};

const normalizeAttachments = (attachments = []) => {
  if (!Array.isArray(attachments)) {
    return [];
  }

  return attachments
    .filter((attachment) => attachment && attachment.dataUrl)
    .map((attachment) => ({
      fileName: attachment.fileName || 'attachment',
      fileType: attachment.fileType || '',
      dataUrl: attachment.dataUrl,
    }));
};

const appendLegacyMessages = (ticketDoc) => {
  const ticket = ticketDoc.toObject({ virtuals: true });

  if (!ticket.messages || ticket.messages.length === 0) {
    const messages = [];

    if (ticket.message) {
      messages.push({
        sender: ticket.customer || null,
        senderRole: 'customer',
        text: ticket.message,
        attachments: [],
        createdAt: ticket.createdAt,
      });
    }

    if (ticket.reply) {
      messages.push({
        sender: ticket.assignedTo || null,
        senderRole: ticket.assignedTo?.role === 'admin' ? 'admin' : 'support',
        text: ticket.reply,
        attachments: [],
        createdAt: ticket.updatedAt || ticket.createdAt,
      });
    }

    ticket.messages = messages;
  }

  return ticket;
};

const ticketHasAccess = (ticket, user) => {
  if (!ticket || !user) {
    return false;
  }

  return ['support', 'admin'].includes(user.role) || String(ticket.customer?._id || ticket.customer) === String(user._id);
};

const addMessageToTicket = async (ticket, user, { text = '', attachments = [] }) => {
  const normalizedAttachments = normalizeAttachments(attachments);
  const cleanedText = String(text || '').trim();

  if (!cleanedText && normalizedAttachments.length === 0) {
    throw new Error('Message text or attachment is required');
  }

  const senderRole = user.role === 'admin' ? 'admin' : user.role === 'support' ? 'support' : 'customer';
  ticket.messages.push({
    sender: user._id,
    senderRole,
    text: cleanedText,
    attachments: normalizedAttachments,
  });

  ticket.message = ticket.message || cleanedText;
  if (senderRole !== 'customer' && cleanedText) {
    ticket.reply = cleanedText;
  }

  if (senderRole !== 'customer' && ticket.status === 'open') {
    ticket.status = 'in_progress';
  }

  if ((senderRole === 'support' || senderRole === 'admin') && !ticket.assignedTo) {
    ticket.assignedTo = user._id;
  }

  await ticket.save();

  return populateTicket(SupportTicket.findById(ticket._id));
};

const notifySupportTicketChanged = (req, ticket) => {
  const io = req.app.get('io');
  if (!io || !ticket?._id) {
    return;
  }

  const payload = {
    ticketId: String(ticket._id),
    status: ticket.status,
    updatedAt: new Date().toISOString(),
  };

  io.emit('support:tickets:changed', payload);
  io.to(`support-ticket:${String(ticket._id)}`).emit('support-ticket:changed', payload);
};

const createTicket = asyncHandler(async (req, res) => {
  const { subject, message = '', orderId = null, attachments = [] } = req.body;

  if (!subject || !message) {
    if (!subject || (!message && (!attachments || attachments.length === 0))) {
      res.status(400);
      throw new Error('subject and a message or attachment are required');
    }
  }

  const normalizedAttachments = normalizeAttachments(attachments);

  const ticket = await SupportTicket.create({
    customer: req.user._id,
    order: orderId || null,
    subject,
    message: String(message || '').trim(),
    reply: '',
    messages: [
      {
        sender: req.user._id,
        senderRole: 'customer',
        text: String(message || '').trim(),
        attachments: normalizedAttachments,
      },
    ],
  });

  const hydrated = await populateTicket(SupportTicket.findById(ticket._id));

  const ticketDoc = await hydrated;
  notifySupportTicketChanged(req, ticketDoc);

  res.status(201).json({ ticket: appendLegacyMessages(ticketDoc) });
});

const listMyTickets = asyncHandler(async (req, res) => {
  const tickets = await populateTicket(
    SupportTicket.find({ customer: req.user._id }).sort({ updatedAt: -1, createdAt: -1 })
  );

  const result = (await tickets).map((ticket) => appendLegacyMessages(ticket));
  res.json({ tickets: result });
});

const listTickets = asyncHandler(async (_req, res) => {
  const tickets = await populateTicket(SupportTicket.find({}).sort({ updatedAt: -1, createdAt: -1 }));

  const result = (await tickets).map((ticket) => appendLegacyMessages(ticket));
  res.json({ tickets: result });
});

const getTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const ticket = await populateTicket(SupportTicket.findById(id));

  if (!ticket) {
    res.status(404);
    throw new Error('Support ticket not found');
  }

  if (!ticketHasAccess(ticket, req.user)) {
    res.status(403);
    throw new Error('Forbidden: insufficient permissions');
  }

  res.json({ ticket: appendLegacyMessages(ticket) });
});

const addTicketMessage = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { text = '', attachments = [] } = req.body;
  const ticket = await SupportTicket.findById(id);

  if (!ticket) {
    res.status(404);
    throw new Error('Support ticket not found');
  }

  if (!ticketHasAccess(ticket, req.user)) {
    res.status(403);
    throw new Error('Forbidden: insufficient permissions');
  }

  if (req.user.role === 'customer' && ticket.status === 'resolved') {
    res.status(400);
    throw new Error('This ticket is resolved and cannot be reopened by customer reply');
  }

  const hydrated = await addMessageToTicket(ticket, req.user, { text, attachments });
  notifySupportTicketChanged(req, hydrated);

  res.json({ ticket: appendLegacyMessages(hydrated) });
});

const updateTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status, reply } = req.body;

  const ticket = await SupportTicket.findById(id);
  if (!ticket) {
    res.status(404);
    throw new Error('Support ticket not found');
  }

  if (status) {
    if (!['open', 'in_progress', 'resolved'].includes(status)) {
      res.status(400);
      throw new Error('Invalid ticket status');
    }
    ticket.status = status;
    if (status === 'resolved') {
      ticket.resolvedBy = req.user._id;
      ticket.resolvedAt = new Date();
    }
  }

  if (reply !== undefined) {
    ticket.reply = reply;
    if (String(reply).trim()) {
      ticket.messages.push({
        sender: req.user._id,
        senderRole: req.user.role === 'admin' ? 'admin' : 'support',
        text: String(reply).trim(),
        attachments: [],
      });
    }
  }

  if (!ticket.assignedTo) {
    ticket.assignedTo = req.user._id;
  }

  await ticket.save();

  const hydrated = await populateTicket(SupportTicket.findById(ticket._id));
  const resolvedTicket = await hydrated;
  notifySupportTicketChanged(req, resolvedTicket);

  res.json({ ticket: appendLegacyMessages(resolvedTicket) });
});

const rateTicket = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rating, comment = '' } = req.body;
  const ticket = await SupportTicket.findById(id);

  if (!ticket) {
    res.status(404);
    throw new Error('Support ticket not found');
  }

  if (String(ticket.customer) !== String(req.user._id)) {
    res.status(403);
    throw new Error('Forbidden: insufficient permissions');
  }

  if (ticket.status !== 'resolved') {
    res.status(400);
    throw new Error('Ticket must be resolved before submitting CSAT');
  }

  const normalizedRating = Number(rating);
  if (!Number.isInteger(normalizedRating) || normalizedRating < 1 || normalizedRating > 5) {
    res.status(400);
    throw new Error('rating must be an integer between 1 and 5');
  }

  ticket.csatRating = normalizedRating;
  ticket.csatComment = String(comment || '').trim();
  ticket.csatSubmittedAt = new Date();

  await ticket.save();

  const hydrated = await populateTicket(SupportTicket.findById(ticket._id));
  const ratedTicket = await hydrated;
  notifySupportTicketChanged(req, ratedTicket);

  res.json({ ticket: appendLegacyMessages(ratedTicket) });
});

module.exports = {
  createTicket,
  listMyTickets,
  listTickets,
  getTicket,
  addTicketMessage,
  updateTicket,
  rateTicket,
};

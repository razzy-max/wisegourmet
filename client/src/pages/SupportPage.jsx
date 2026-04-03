import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supportApi } from '../api/supportApi';
import { filesToAttachments } from '../utils/attachments';
import LoadingSpinner from '../components/LoadingSpinner';
import { orderApi } from '../api/orderApi';

const initialForm = {
  orderId: '',
  subject: '',
  message: '',
  attachments: [],
};

export default function SupportPage() {
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState(initialForm);
  const [orders, setOrders] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const selectedOrderId = searchParams.get('orderId') || '';
    if (selectedOrderId) {
      setForm((prev) => ({ ...prev, orderId: selectedOrderId }));
    }
  }, [searchParams]);

  const loadOrders = useCallback(async () => {
    try {
      const response = await orderApi.myOrders();
      setOrders(response.orders || []);
    } catch {
      setOrders([]);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ticketsResponse] = await Promise.all([supportApi.myTickets(), loadOrders()]);
      const response = ticketsResponse;
      setTickets(response.tickets || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [loadOrders]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      const response = await supportApi.createTicket({
        ...form,
        orderId: form.orderId || null,
      });
      setForm(initialForm);
      setMessage('Support ticket created');
      await load();
      if (response.ticket?._id) {
        navigate(`/support/tickets/${response.ticket._id}`);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFiles = async (event) => {
    const attachments = await filesToAttachments(event.target.files || []);
    setForm((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...attachments],
    }));
    event.target.value = '';
  };

  const removeAttachment = (index) => {
    setForm((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, attachmentIndex) => attachmentIndex !== index),
    }));
  };

  return (
    <section className="page-wrap">
      <h1>Support Tickets</h1>
      <article className="panel narrow">
        <form className="form" onSubmit={submit}>
          <select
            value={form.orderId}
            onChange={(event) => setForm((prev) => ({ ...prev, orderId: event.target.value }))}
          >
            <option value="">General issue (no order linked)</option>
            {orders.map((order) => (
              <option key={order._id} value={order._id}>
                {`Order ${order._id.slice(-6)} - ${order.status}`}
              </option>
            ))}
          </select>
          <input
            placeholder="Subject"
            value={form.subject}
            onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
            required
          />
          <textarea
            placeholder="Describe the issue"
            value={form.message}
            onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
            required
          />
          <input type="file" accept="image/*" multiple onChange={handleFiles} />
          {form.attachments.length ? (
            <div className="ticket-upload-list">
              {form.attachments.map((attachment, index) => (
                <div className="ticket-upload-item" key={`${attachment.fileName}-${index}`}>
                  <span>{attachment.fileName}</span>
                  <button type="button" className="btn btn-ghost" onClick={() => removeAttachment(index)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <button className="btn" type="submit">
            Create support ticket
          </button>
        </form>
        {message ? <p className="message">{message}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </article>

      <article className="panel" style={{ marginTop: '1rem' }}>
        <h3>My tickets</h3>
        {loading ? <LoadingSpinner label="Loading your tickets..." /> : null}
        {!loading && tickets.length === 0 ? <p className="muted">No tickets yet. Create one above.</p> : null}
        <div className="grid">
          {tickets.map((ticket) => (
            <Link className="panel ticket-card" key={ticket._id} to={`/support/tickets/${ticket._id}`}>
              <p><strong>{ticket.subject}</strong></p>
              <p>Status: {ticket.status}</p>
              <p>Linked order: {ticket.order?._id ? ticket.order._id.slice(-6) : 'None'}</p>
              <p>{ticket.messages?.[ticket.messages.length - 1]?.text || ticket.reply || 'Open ticket to view the conversation'}</p>
            </Link>
          ))}
        </div>
      </article>
    </section>
  );
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supportApi } from '../api/supportApi';
import LoadingSpinner from '../components/LoadingSpinner';
import EnableAlertsCard from '../components/EnableAlertsCard';

const getTicketStatusBadge = (status) => {
  const badges = {
    open: { label: 'Open', emoji: '✉', badgeColor: 'status-pending' },
    in_progress: { label: 'In Progress', emoji: '⏳', badgeColor: 'status-confirmed' },
    resolved: { label: 'Resolved', emoji: '✓', badgeColor: 'status-delivered' },
  };
  return badges[status] || { label: status, emoji: '•', badgeColor: 'status-default' };
};

const getTicketStatusText = (status) => {
  const badge = getTicketStatusBadge(status);
  return `${badge.emoji} ${badge.label}`;
};

export default function SupportInboxPage() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [replyInputs, setReplyInputs] = useState({});
  const [filter, setFilter] = useState('open');
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const response = await supportApi.allTickets();
      setTickets(response.tickets || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCount = tickets.filter((ticket) => ticket.status !== 'resolved').length;
  const closedCount = tickets.filter((ticket) => ticket.status === 'resolved').length;
  const filteredTickets = tickets.filter((ticket) => {
    const searchValue = search.trim().toLowerCase();
    const latestMessage = ticket.messages?.[ticket.messages.length - 1]?.text || ticket.message || '';
    const matchesSearch =
      !searchValue ||
      ticket.subject?.toLowerCase().includes(searchValue) ||
      ticket.customer?.fullName?.toLowerCase().includes(searchValue) ||
      String(ticket._id || '').toLowerCase().includes(searchValue) ||
      String(ticket.order?._id || '').toLowerCase().includes(searchValue) ||
      latestMessage.toLowerCase().includes(searchValue);

    if (!matchesSearch) {
      return false;
    }

    if (filter === 'open') {
      return ticket.status !== 'resolved';
    }
    if (filter === 'closed') {
      return ticket.status === 'resolved';
    }
    return true;
  });

  const save = async (ticketId, status) => {
    try {
      await supportApi.updateTicket(ticketId, {
        status,
        reply: replyInputs[ticketId] || '',
      });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="page-wrap">
      <EnableAlertsCard />
      <h1>Support Inbox</h1>
      <div className="row" style={{ marginBottom: '0.75rem' }}>
        <button
          className={filter === 'open' ? 'btn' : 'btn btn-ghost'}
          type="button"
          onClick={() => setFilter('open')}
        >
          Open ({openCount})
        </button>
        <button
          className={filter === 'closed' ? 'btn' : 'btn btn-ghost'}
          type="button"
          onClick={() => setFilter('closed')}
        >
          Closed ({closedCount})
        </button>
        <button
          className={filter === 'all' ? 'btn' : 'btn btn-ghost'}
          type="button"
          onClick={() => setFilter('all')}
        >
          All ({tickets.length})
        </button>
      </div>
      <div className="panel" style={{ marginBottom: '0.75rem' }}>
        <input
          placeholder="Search tickets by subject, customer, order id, or message"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      {error ? <p className="error">{error}</p> : null}
      {loading ? <LoadingSpinner label="Loading inbox..." /> : null}
      {!loading && filteredTickets.length === 0 ? <p className="muted">No tickets in this view.</p> : null}
      <div className="grid">
        {filteredTickets.map((ticket) => (
          <article className="panel ticket-admin-card" key={ticket._id}>
            <div className="ticket-card-header">
              <Link to={`/support/tickets/${ticket._id}`} className="ticket-subject">
                {ticket.subject}
              </Link>
              <span className={`status-badge ${getTicketStatusBadge(ticket.status).badgeColor}`}>
                {getTicketStatusText(ticket.status)}
              </span>
            </div>

            <div className="ticket-card-info">
              <p>
                <strong>Customer:</strong> {ticket.customer?.fullName || 'Unknown'}
              </p>
              {ticket.order && (
                <p>
                  <strong>Order:</strong> #{ticket.order._id.slice(-6)}
                </p>
              )}
            </div>

            <div className="ticket-card-preview">
              <p className="muted">
                Latest: {ticket.messages?.[ticket.messages.length - 1]?.text || ticket.message}
              </p>
            </div>

            <div className="ticket-reply-section">
              <textarea
                placeholder="Reply message..."
                value={replyInputs[ticket._id] || ''}
                onChange={(event) =>
                  setReplyInputs((prev) => ({ ...prev, [ticket._id]: event.target.value }))
                }
                className="ticket-reply-textarea"
              />
              <div className="ticket-reply-actions">
                <button
                  className="btn btn-amber"
                  type="button"
                  onClick={() => save(ticket._id, 'in_progress')}
                >
                  Mark in progress
                </button>
                <button className="btn" type="button" onClick={() => save(ticket._id, 'resolved')}>
                  Resolve
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderApi } from '../api/orderApi';
import { supportApi } from '../api/supportApi';
import { useOrdersRealtime } from '../hooks/useOrdersRealtime';
import { ChartIcon, FoodIcon, PackageIcon, TeamIcon, KeyIcon, ZoneIcon, ReceiptIcon, MessageIcon } from '../components/icons';
import { getStatusLabel } from '../utils/statusHelpers';
import './AdminPolish.css';

const formatRelativeTime = (isoDate) => {
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) {
    return '';
  }

  const diffMs = Date.now() - then;
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function useCountUp(value, duration = 400) {
  const [display, setDisplay] = useState(value);
  const previousRef = useRef(value);

  useEffect(() => {
    const from = previousRef.current;
    const to = Number(value) || 0;

    if (from === to || prefersReducedMotion()) {
      previousRef.current = to;
      setDisplay(to);
      return;
    }

    let frameId;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(from + (to - from) * progress));
      if (progress < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        previousRef.current = to;
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => frameId && cancelAnimationFrame(frameId);
  }, [value, duration]);

  return display;
}

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState([]);
  const [tickets, setTickets] = useState([]);

  const load = useCallback(async () => {
    try {
      const response = await orderApi.allOrders();
      setOrders(response.orders || []);
    } catch {
      setOrders([]);
    }
  }, []);

  const loadTickets = useCallback(async () => {
    try {
      const response = await supportApi.allTickets();
      setTickets(response.tickets || []);
    } catch {
      setTickets([]);
    }
  }, []);

  useEffect(() => {
    load();
    loadTickets();
  }, [load, loadTickets]);

  useOrdersRealtime(load);

  const activity = useMemo(() => {
    const orderEvents = orders
      .map((order) => {
        const timeline = order.statusTimeline || [];
        const latest = timeline[timeline.length - 1];
        if (!latest) {
          return null;
        }
        return {
          key: `order-${order._id}`,
          at: latest.changedAt,
          node: (
            <>
              Order <Link to={`/orders/${order._id}`}>#{order._id.slice(-6)}</Link> — {getStatusLabel(order.status)}
            </>
          ),
        };
      })
      .filter(Boolean);

    const ticketEvents = tickets.map((ticket) => ({
      key: `ticket-${ticket._id}`,
      at: ticket.createdAt,
      node: (
        <>
          New ticket from <strong>{ticket.customer?.fullName || 'a customer'}</strong> — {ticket.subject}
        </>
      ),
    }));

    return [...orderEvents, ...ticketEvents]
      .filter((event) => event.at)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 7);
  }, [orders, tickets]);

  const counts = orders.reduce(
    (accumulator, order) => {
      accumulator.total += 1;
      accumulator[order.status] = (accumulator[order.status] || 0) + 1;
      return accumulator;
    },
    {
      total: 0,
      pending: 0,
      confirmed: 0,
      preparing: 0,
      ready_for_pickup: 0,
      picked_up: 0,
      on_the_way: 0,
      arrived: 0,
      delivered: 0,
    }
  );

  const fulfilledCount = Number(counts.delivered || 0) + Number(counts.picked_up || 0);

  const displayConfirmed = useCountUp(counts.confirmed);
  const displayPreparing = useCountUp(counts.preparing);
  const displayReady = useCountUp(counts.ready_for_pickup);
  const displayFulfilled = useCountUp(fulfilledCount);

  return (
    <section className="page-wrap">
      <h1>Admin Dashboard</h1>
      <div className="grid">
        <article className="panel admin-dashboard-overview">
          <h3>Live Overview</h3>
          <div className="overview-stats">
            <div className="overview-stat">
              <span className="stat-label">Confirmed</span>
              <span className="stat-number" style={{ color: '#e8a020' }}>
                {displayConfirmed}
              </span>
            </div>
            <div className="overview-stat">
              <span className="stat-label">Preparing</span>
              <span className="stat-number" style={{ color: '#e8a020' }}>
                {displayPreparing}
              </span>
            </div>
            <div className="overview-stat">
              <span className="stat-label">Ready</span>
              <span className="stat-number" style={{ color: '#e8a020' }}>
                {displayReady}
              </span>
            </div>
            <div className="overview-stat">
              <span className="stat-label">Fulfilled</span>
              <span className="stat-number" style={{ color: '#3a6835' }}>
                {displayFulfilled}
              </span>
            </div>
          </div>
        </article>
        <article className="panel">
          <div className="admin-card-icon-badge badge-blue">
            <ChartIcon size={20} />
          </div>
          <h3>Operations</h3>
          <p>Watch orders move from payment to kitchen to dispatch in real time.</p>
          <p>Claimed kitchen orders show the staff member handling them.</p>
          <p>Assigned riders show who has accepted each delivery.</p>
          <Link to="/admin/stats" className="btn">
            Open Detailed Stats
          </Link>
        </article>
      </div>

      <article className="panel" style={{ marginTop: '1rem' }}>
        <h3>Recent Activity</h3>
        {activity.length === 0 ? (
          <p className="muted">Nothing to show yet — activity will appear here as orders and tickets come in.</p>
        ) : (
          <ul className="admin-activity-list">
            {activity.map((event) => (
              <li key={event.key}>
                <span className="admin-activity-icon">
                  {event.key.startsWith('ticket-') ? <MessageIcon size={14} /> : <ReceiptIcon size={14} />}
                </span>
                <span className="admin-activity-text">{event.node}</span>
                <span className="admin-activity-time tabular">{formatRelativeTime(event.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </article>

      <div className="grid" style={{ marginTop: '1rem' }}>
        <article className="panel">
          <div className="admin-card-icon-badge badge-green">
            <FoodIcon size={20} />
          </div>
          <h3>Menu Management</h3>
          <p>Manage categories, products, prices, and availability.</p>
          <Link to="/admin/menu" className="btn">
            Open Menu Manager
          </Link>
        </article>
        <article className="panel">
          <div className="admin-card-icon-badge badge-amber">
            <PackageIcon size={20} />
          </div>
          <h3>Order Operations</h3>
          <p>Track all orders and move statuses through dispatch workflow.</p>
          <Link to="/admin/orders" className="btn">
            Open Orders
          </Link>
        </article>
        <article className="panel">
          <div className="admin-card-icon-badge badge-purple">
            <TeamIcon size={20} />
          </div>
          <h3>Team Management</h3>
          <p>Create and manage staff and rider accounts.</p>
          <Link to="/admin/team" className="btn">
            Open Team Manager
          </Link>
        </article>
        <article className="panel">
          <div className="admin-card-icon-badge badge-slate">
            <KeyIcon size={20} />
          </div>
          <h3>Security</h3>
          <p>Change your admin password.</p>
          <Link to="/admin/password" className="btn">
            Change Password
          </Link>
        </article>
        <article className="panel">
          <div className="admin-card-icon-badge badge-teal">
            <ZoneIcon size={20} />
          </div>
          <h3>Delivery Zones</h3>
          <p>Adjust zone fees and active delivery coverage for checkout.</p>
          <Link to="/admin/zones" className="btn">
            Manage Zones
          </Link>
        </article>
      </div>
    </section>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { orderApi } from '../api/orderApi';
import { useOrdersRealtime } from '../hooks/useOrdersRealtime';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import { getStatusLabel } from '../utils/statusHelpers';
import { PackageIcon, FoodIcon } from '../components/icons';
import './MyOrdersPage.css';

const getStatusTone = (status) => {
  if (['arrived', 'picked_up', 'delivered'].includes(status)) {
    return 'success';
  }
  if (['confirmed', 'preparing', 'ready_for_pickup', 'on_the_way'].includes(status)) {
    return 'active';
  }
  return 'muted';
};

// Orders are "past" once they're fully resolved. For delivery orders that's
// "delivered" (picked_up just means the rider has it, not the customer yet).
// For self-pickup orders, "picked_up" IS the terminal state - the customer
// already has their food, so it belongs in Past, not Active.
const isPastOrder = (order) => {
  if (order.status === 'cancelled') {
    return true;
  }
  if (order.fulfillmentType === 'self_pickup') {
    return order.status === 'picked_up';
  }
  return order.status === 'delivered';
};

export default function MyOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('active');
  const didSetDefaultTab = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await orderApi.myOrders();
      setOrders(response.orders || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useOrdersRealtime(load);

  const activeOrders = useMemo(() => orders.filter((order) => !isPastOrder(order)), [orders]);
  const pastOrders = useMemo(() => orders.filter((order) => isPastOrder(order)), [orders]);

  // Pick a sensible default tab once the first load completes: land on
  // "Active" if there's anything in flight, otherwise "Past" so customers
  // without active orders don't land on an empty tab.
  useEffect(() => {
    if (!loading && !didSetDefaultTab.current) {
      didSetDefaultTab.current = true;
      setActiveTab(activeOrders.length > 0 ? 'active' : 'past');
    }
  }, [loading, activeOrders]);

  const visibleOrders = activeTab === 'active' ? activeOrders : pastOrders;

  return (
    <section className="page-wrap">
      <h1>My Orders</h1>
      {error ? <p className="error">{error}</p> : null}
      {loading ? <LoadingSpinner label="Loading your orders..." /> : null}
      {!loading && orders.length === 0 ? (
        <EmptyState
          icon={PackageIcon}
          heading="No orders yet"
          subtext="Your first order will show up here once you place it."
          actionLabel="Browse the menu"
          onAction={() => navigate('/')}
        />
      ) : null}

      {!loading && orders.length > 0 ? (
        <>
          <div className="order-tabs">
            <button
              type="button"
              className={activeTab === 'active' ? 'btn' : 'btn btn-ghost'}
              onClick={() => setActiveTab('active')}
            >
              Active · {activeOrders.length}
            </button>
            <button
              type="button"
              className={activeTab === 'past' ? 'btn' : 'btn btn-ghost'}
              onClick={() => setActiveTab('past')}
            >
              Past · {pastOrders.length}
            </button>
          </div>

          {visibleOrders.length === 0 ? (
            <p className="muted tab-empty-message">
              {activeTab === 'active'
                ? 'No active orders right now.'
                : 'No past orders yet.'}
            </p>
          ) : (
            <div className="grid">
              {visibleOrders.map((order) => (
                <article className={`panel order-card tone-${getStatusTone(order.status)}`} key={order._id}>
                  <p className="muted order-id">Order #{order._id.slice(-6)}</p>
                  <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
                    <p className="summary-total">₦{Number(order.total || 0).toLocaleString()}</p>
                    <span className={`status-badge status-${getStatusTone(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  <Link className="order-link" to={`/orders/${order._id}`}>
                    View order details →
                  </Link>
                </article>
              ))}
            </div>
          )}
        </>
      ) : null}

      {!loading && orders.length > 0 && (
        <div className="page-footer">
          <Link to="/" className="footer-suggestion">
            <span className="footer-icon"><FoodIcon size={16} /></span>
            <span>Ready to order again? Browse the menu</span>
          </Link>
        </div>
      )}
    </section>
  );
}

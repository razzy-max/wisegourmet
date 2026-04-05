import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderApi } from '../api/orderApi';
import { useOrdersRealtime } from '../hooks/useOrdersRealtime';
import LoadingSpinner from '../components/LoadingSpinner';

const getStatusTone = (status) => {
  if (['arrived', 'picked_up', 'delivered'].includes(status)) {
    return 'success';
  }
  if (['confirmed', 'preparing', 'ready_for_pickup', 'on_the_way'].includes(status)) {
    return 'active';
  }
  return 'muted';
};

const getStatusLabel = (status) => {
  const readable = String(status || '').replaceAll('_', ' ');
  if (status === 'delivered') return '✓ Delivered';
  if (status === 'picked_up') return '✓ Picked up';
  if (status === 'confirmed') return '⏳ Confirmed';
  if (status === 'on_the_way') return '🚚 On the way';
  if (status === 'cancelled') return '✕ Cancelled';
  return readable.charAt(0).toUpperCase() + readable.slice(1);
};

export default function MyOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

  return (
    <section className="page-wrap">
      <h1>My Orders</h1>
      {error ? <p className="error">{error}</p> : null}
      {loading ? <LoadingSpinner label="Loading your orders..." /> : null}
      {!loading && orders.length === 0 ? (
        <article className="panel empty-state">
          <p className="empty-icon" aria-hidden="true">📦</p>
          <p className="muted">No orders yet. Your first order will show up here.</p>
        </article>
      ) : null}
      <div className="grid">
        {orders.map((order) => (
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

      {!loading && orders.length > 0 && (
        <div className="page-footer">
          <Link to="/" className="footer-suggestion">
            <span className="footer-icon">🍽</span>
            <span>Ready to order again? Browse the menu</span>
          </Link>
        </div>
      )}
    </section>
  );
}

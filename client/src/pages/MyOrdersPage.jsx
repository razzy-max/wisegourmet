import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderApi } from '../api/orderApi';
import { useOrdersRealtime } from '../hooks/useOrdersRealtime';
import LoadingSpinner from '../components/LoadingSpinner';

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
      {!loading && orders.length === 0 ? <p className="muted">No orders yet.</p> : null}
      <div className="grid">
        {orders.map((order) => (
          <article className="panel" key={order._id} style={{ display: 'grid', gap: '0.5rem' }}>
            <h3>Order {order._id.slice(-6)}</h3>
            <p>Status: {order.status}</p>
            <p>Total: N {Number(order.total || 0).toLocaleString()}</p>
            <Link className="btn" to={`/orders/${order._id}`}>
              View order details
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

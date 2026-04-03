import { useCallback, useEffect, useState } from 'react';
import { orderApi } from '../api/orderApi';
import { useAuth } from '../context/AuthContext';
import { useOrdersRealtime } from '../hooks/useOrdersRealtime';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AdminOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response =
        user?.role === 'rider' ? await orderApi.riderOrders() : await orderApi.allOrders();
      setOrders(response.orders || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    load();
  }, [load]);

  useOrdersRealtime(load);

  return (
    <section className="page-wrap">
      <h1>{user?.role === 'rider' ? 'My Dispatch Orders' : 'Admin Orders'}</h1>
      <p className="muted">Live view only. Kitchen staff and riders self-assign their workflow.</p>
      {error ? <p className="error">{error}</p> : null}
      {loading ? <LoadingSpinner label="Loading orders..." /> : null}
      {!loading && orders.length === 0 ? <p className="muted">No orders available.</p> : null}
      <div className="grid">
        {orders.map((order) => (
          <article className="panel" key={order._id}>
            <h3>Order {order._id.slice(-6)}</h3>
            <p>Customer: {order.customer?.fullName || 'Unknown'}</p>
            <p>Status: {order.status}</p>
            <p>Total: N {order.total.toLocaleString()}</p>
            <p>Kitchen handled by: {order.kitchenHandledBy?.fullName || 'Not claimed yet'}</p>
            <p>Rider: {order.assignedRider?.fullName || 'Not assigned yet'}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

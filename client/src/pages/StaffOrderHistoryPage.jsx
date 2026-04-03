import { useEffect, useState } from 'react';
import { orderApi } from '../api/orderApi';

export default function StaffOrderHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const response = await orderApi.allOrders();
      setOrders(response.orders || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const completedOrders = orders.filter((order) => order.status === 'delivered' || order.status === 'cancelled');

  const avgPrepTime = completedOrders.length > 0
    ? Math.round(completedOrders.reduce((sum, order) => {
        const start = order.statusTimeline.find((s) => s.status === 'confirmed')?.changedAt;
        const end = order.statusTimeline.find((s) => s.status === 'ready_for_pickup')?.changedAt;
        return sum + (start && end ? (new Date(end) - new Date(start)) / 60000 : 0);
      }, 0) / completedOrders.length)
    : 0;

  return (
    <section className="page-wrap">
      <h1>Order History</h1>
      {error ? <p className="error">{error}</p> : null}

      <article className="panel">
        <div className="row">
          <div>
            <strong>Orders Today:</strong> {orders.length}
          </div>
          <div>
            <strong>Completed:</strong> {completedOrders.length}
          </div>
          <div>
            <strong>Avg Prep Time:</strong> ~{avgPrepTime}min
          </div>
        </div>
      </article>

      <article className="panel" style={{ marginTop: '1rem' }}>
        <h3>Completed Orders</h3>
        <div className="grid">
          {completedOrders.map((order) => (
            <article className="panel" key={order._id}>
              <h4>Order {order._id.slice(-6)}</h4>
              <p>Customer: {order.customer?.fullName || 'Unknown'}</p>
              <p>Status: {order.status}</p>
              <p>Total: N {Number(order.total || 0).toLocaleString()}</p>
              <p className="muted">
                {new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}
              </p>
            </article>
          ))}
          {completedOrders.length === 0 ? <p className="muted">No completed orders yet.</p> : null}
        </div>
      </article>
    </section>
  );
}

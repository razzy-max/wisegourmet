import { useEffect, useState } from 'react';
import { orderApi } from '../api/orderApi';
import Skeleton from '../components/Skeleton';
import { getStatusLabel, getStatusBadgeClass } from '../utils/statusHelpers';
import './OpsPages.css';

export default function RiderDeliveryHistoryPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const response = await orderApi.riderOrders();
      setOrders(response.orders || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const completedOrders = orders.filter((order) => order.status === 'delivered' || order.status === 'cancelled');
  const totalEarnings = completedOrders.filter((order) => order.status === 'delivered').reduce((sum, order) => sum + (order.deliveryFee || 0), 0);

  return (
    <section className="page-wrap">
      <h1>Delivery History</h1>
      {error ? <p className="error">{error}</p> : null}
      {loading ? <Skeleton variant="card" count={3} /> : null}

      <article className="panel">
        <div className="row">
          <div>
            <strong>Total Deliveries:</strong> {completedOrders.length}
          </div>
          <div>
            <strong>Earnings:</strong> ₦{Number(totalEarnings || 0).toLocaleString()}
          </div>
        </div>
      </article>

      <article className="panel" style={{ marginTop: '1rem' }}>
        <h3>Completed Deliveries</h3>
        <div className="grid">
          {completedOrders.map((order, index) => (
            <article
              className="panel order-card-enter"
              key={order._id}
              style={{ '--order-card-delay': `${Math.min(index, 8) * 0.05}s` }}
            >
              <div className="zone-card-top">
                <h4>Order {order._id.slice(-6)}</h4>
                <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>
              <p>Fee: ₦{Number(order.deliveryFee || 0).toLocaleString()}</p>
              <p className="muted">
                {new Date(order.updatedAt).toLocaleDateString()} {new Date(order.updatedAt).toLocaleTimeString()}
              </p>
            </article>
          ))}
          {completedOrders.length === 0 ? <p className="muted">No completed deliveries yet.</p> : null}
        </div>
      </article>
    </section>
  );
}

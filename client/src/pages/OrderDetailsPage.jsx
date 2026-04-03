import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { orderApi } from '../api/orderApi';
import { useOrdersRealtime } from '../hooks/useOrdersRealtime';
import LoadingSpinner from '../components/LoadingSpinner';

const dedupeTimeline = (timeline = []) => {
  return timeline.filter((entry, index, array) => {
    if (index === 0) return true;
    const previous = array[index - 1];
    return !(previous.status === entry.status && previous.changedAt === entry.changedAt);
  });
};

export default function OrderDetailsPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await orderApi.getOrder(id);
      setOrder(response.order);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useOrdersRealtime(load, { orderId: id });

  if (error) {
    return (
      <section className="page-wrap">
        <Link to="/orders" className="btn">
          Back to orders
        </Link>
        <p className="error">{error}</p>
      </section>
    );
  }

  if (!order) {
    return (
      <section className="page-wrap">
        <LoadingSpinner label="Loading order..." />
      </section>
    );
  }

  const timeline = dedupeTimeline(order.statusTimeline || []);
  return (
    <section className="page-wrap">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>Order {order._id.slice(-6)}</h1>
          <p className="muted">Live order detail and delivery tracking</p>
        </div>
        <div className="row">
          <Link to={`/support?orderId=${order._id}`} className="btn">
            Get Help For This Order
          </Link>
          <Link to="/orders" className="btn btn-ghost">
            Back to orders
          </Link>
        </div>
      </div>

      <div className="grid">
        <article className="panel">
          <h3>Summary</h3>
          <p>Status: {order.status}</p>
          <p>Payment: {order.payment?.status}</p>
          <p>Order total: N {Number(order.total || 0).toLocaleString()}</p>
          <p>Delivery fee: N {Number(order.deliveryFee || 0).toLocaleString()}</p>
          <p>Payment reference: {order.payment?.reference || 'N/A'}</p>
          <p>
            Kitchen handled by:{' '}
            {order.kitchenHandledBy ? order.kitchenHandledBy.fullName : 'Not claimed yet'}
          </p>
          <p>
            Rider assigned:{' '}
            {order.assignedRider
              ? `${order.assignedRider.fullName}${order.assignedRider.phone ? ` (${order.assignedRider.phone})` : ''}`
              : 'Not assigned yet'}
          </p>
        </article>

        <article className="panel">
          <h3>Delivery PIN</h3>
          {order.payment?.status === 'paid' && order.deliveryPin ? (
            <>
              <p className="muted">Share this PIN with the rider when they arrive.</p>
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <strong style={{ fontSize: '2.5rem', letterSpacing: '0.5rem' }}>{order.deliveryPin}</strong>
              </div>
            </>
          ) : (
            <p className="muted">PIN will appear after payment is verified.</p>
          )}
        </article>
      </div>

      <div className="grid" style={{ marginTop: '1rem' }}>
        <article className="panel">
          <h3>Customer & Delivery</h3>
          <p>Name: {order.customer?.fullName || 'Unknown'}</p>
          <p>Phone: {order.customer?.phone || 'N/A'}</p>
          <p>Address: {order.deliveryAddress?.fullText || 'Not provided'}</p>
          <p>Area: {order.deliveryAddress?.area || 'N/A'}</p>
          <p>Landmark: {order.deliveryAddress?.landmark || 'N/A'}</p>
          <p>Notes: {order.deliveryAddress?.notes || 'None'}</p>
        </article>

        <article className="panel">
          <h3>Rider</h3>
          <p>Name: {order.assignedRider?.fullName || 'Not assigned yet'}</p>
          <p>Phone: {order.assignedRider?.phone || 'N/A'}</p>
          <p>Status: {['picked_up', 'on_the_way', 'arrived', 'delivered'].includes(order.status) ? order.status : 'Waiting for dispatch'}</p>
        </article>
      </div>

      <article className="panel" style={{ marginTop: '1rem' }}>
        <h3>Status Timeline</h3>
        <ul className="timeline">
          {timeline.map((entry, index) => (
            <li key={`${entry.status}-${entry.changedAt}-${index}`}>
              <strong>{entry.status}</strong> - {new Date(entry.changedAt).toLocaleString()}
              {entry.note ? ` - ${entry.note}` : ''}
              {entry.changedBy?.fullName ? ` (${entry.changedBy.fullName})` : ''}
            </li>
          ))}
        </ul>
      </article>

      <article className="panel" style={{ marginTop: '1rem' }}>
        <h3>Items</h3>
        <ul className="timeline">
          {(order.items || []).map((item, index) => (
            <li key={`${item.menuItem || item.name}-${index}`}>
              {item.quantity}x {item.name} - N {Number(item.price || 0).toLocaleString()}
            </li>
          ))}
        </ul>
      </article>
    </section>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { orderApi } from '../api/orderApi';
import { useOrdersRealtime } from '../hooks/useOrdersRealtime';
import LoadingSpinner from '../components/LoadingSpinner';

const KITCHEN_STATUSES = ['confirmed', 'preparing'];

export default function KitchenOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await orderApi.allOrders();
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

  const kitchenOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          KITCHEN_STATUSES.includes(order.status) ||
          (order.fulfillmentType === 'self_pickup' && order.status === 'ready_for_pickup')
      ),
    [orders]
  );

  const updateStatus = async (orderId, status, note) => {
    setError('');
    setMessage('');
    setUpdatingOrderId(orderId);

    try {
      await orderApi.updateStatus(orderId, { status, note });
      setMessage(`Order ${orderId.slice(-6)} updated to ${status}`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingOrderId('');
    }
  };

  return (
    <section className="page-wrap">
      <h1>Kitchen Dashboard</h1>
      <p className="muted">Manage confirmed orders and move them to ready_for_pickup.</p>
      {message ? <p className="message">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {loading ? <LoadingSpinner label="Loading kitchen orders..." /> : null}
      {!loading && kitchenOrders.length === 0 ? <p className="muted">No kitchen orders pending right now.</p> : null}

      <div className="grid">
        {kitchenOrders.map((order) => (
          <article className="panel" key={order._id}>
            <h3>Order {order._id.slice(-6)}</h3>
            <p>Customer: {order.customer?.fullName || 'Unknown'}</p>
            <p>Status: {order.status}</p>
            <p>Fulfillment: {order.fulfillmentType === 'self_pickup' ? 'Self pickup' : 'Delivery'}</p>
            <p>Total: ₦{Number(order.total || 0).toLocaleString()}</p>
            <p>
              Handled by:{' '}
              {order.kitchenHandledBy?.fullName ? order.kitchenHandledBy.fullName : 'Unclaimed yet'}
            </p>
            <p>
              {order.fulfillmentType === 'self_pickup'
                ? 'Pickup at kitchen counter'
                : `Address: ${order.deliveryAddress?.fullText || 'Not provided'}`}
            </p>

            <div>
              <strong>Items</strong>
              <ul className="timeline">
                {(order.items || []).map((item, index) => (
                  <li key={`${order._id}-${index}`}>
                    {item.quantity}x {item.name}
                  </li>
                ))}
              </ul>
            </div>

            <div className="row">
              {order.status === 'confirmed' ? (
                <button
                  className="btn"
                  type="button"
                  onClick={() => updateStatus(order._id, 'preparing', 'Kitchen started preparing')}
                  disabled={updatingOrderId === order._id}
                >
                  {updatingOrderId === order._id ? 'Updating...' : 'Start Preparing'}
                </button>
              ) : null}

              {order.status === 'preparing' ? (
                <button
                  className="btn"
                  type="button"
                  onClick={() => updateStatus(order._id, 'ready_for_pickup', 'Kitchen marked ready')}
                  disabled={updatingOrderId === order._id}
                >
                  {updatingOrderId === order._id ? 'Updating...' : 'Mark Ready for Pickup'}
                </button>
              ) : null}

              {order.fulfillmentType === 'self_pickup' && order.status === 'ready_for_pickup' ? (
                <button
                  className="btn"
                  type="button"
                  onClick={() => updateStatus(order._id, 'delivered', 'Customer collected self pickup order')}
                  disabled={updatingOrderId === order._id}
                >
                  {updatingOrderId === order._id ? 'Updating...' : 'Mark Collected'}
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

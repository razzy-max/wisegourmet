import { useCallback, useEffect, useMemo, useState } from 'react';
import { orderApi } from '../api/orderApi';
import { useOrdersRealtime } from '../hooks/useOrdersRealtime';
import LoadingSpinner from '../components/LoadingSpinner';
import EnableAlertsCard from '../components/EnableAlertsCard';

export default function RiderQueuePage() {
  const [queueOrders, setQueueOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pinInputs, setPinInputs] = useState({});
  const [acceptingOrderId, setAcceptingOrderId] = useState('');
  const [updatingStatusOrderId, setUpdatingStatusOrderId] = useState('');
  const [verifyingPinOrderId, setVerifyingPinOrderId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [queueResponse, myResponse] = await Promise.all([
        orderApi.riderQueue(),
        orderApi.riderOrders(),
      ]);

      setQueueOrders(queueResponse.orders || []);
      setMyOrders(myResponse.orders || []);
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

  const activeOrders = useMemo(
    () =>
      myOrders.filter((order) =>
        ['picked_up', 'on_the_way', 'arrived'].includes(order.status)
      ),
    [myOrders]
  );

  const acceptOrder = async (orderId) => {
    setError('');
    setMessage('');
    setAcceptingOrderId(orderId);

    try {
      await orderApi.acceptRiderOrder(orderId);
      setMessage(`Order ${orderId.slice(-6)} accepted`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setAcceptingOrderId('');
    }
  };

  const updateStatus = async (orderId, status) => {
    setError('');
    setMessage('');
    setUpdatingStatusOrderId(orderId);

    try {
      await orderApi.updateStatus(orderId, {
        status,
        note: `Rider moved order to ${status}`,
      });
      setMessage(`Order ${orderId.slice(-6)} updated to ${status}`);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingStatusOrderId('');
    }
  };

  const verifyDeliveryPin = async (orderId) => {
    setError('');
    setMessage('');

    const pin = pinInputs[orderId]?.trim();
    if (!pin) {
      setError(`Enter PIN for order ${orderId.slice(-6)}`);
      return;
    }

    setVerifyingPinOrderId(orderId);
    try {
      await orderApi.verifyDeliveryPin(orderId, pin);
      setMessage(`Order ${orderId.slice(-6)} delivered!`);
      setPinInputs((prev) => ({ ...prev, [orderId]: '' }));
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifyingPinOrderId('');
    }
  };

  return (
    <section className="page-wrap">
      <EnableAlertsCard />
      <h1>Rider Dispatch Queue</h1>
      {message ? <p className="message">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {loading ? <LoadingSpinner label="Loading dispatch queue..." /> : null}

      <article className="panel">
        <h3>Ready for Pickup</h3>
        <div className="grid">
          {queueOrders.map((order) => (
            <article className="panel" key={order._id}>
              <h4>Order {order._id.slice(-6)}</h4>
              <p>Customer: {order.customer?.fullName || 'Unknown'}</p>
              <p>Phone: {order.customer?.phone || 'Not provided'}</p>
              <p>Status: {order.status}</p>
              <p>
                Accepted by:{' '}
                {order.assignedRider?.fullName ? order.assignedRider.fullName : 'Available for pickup'}
              </p>
              <p>Address: {order.deliveryAddress?.fullText || 'Not provided'}</p>
              <button 
                className="btn" 
                type="button" 
                onClick={() => acceptOrder(order._id)}
                disabled={acceptingOrderId === order._id}
              >
                {acceptingOrderId === order._id ? 'Accepting...' : 'Accept Order'}
              </button>
            </article>
          ))}
          {queueOrders.length === 0 ? <p className="muted">No ready orders available.</p> : null}
        </div>
      </article>

      <article id="active-deliveries" className="panel" style={{ marginTop: '1rem' }}>
        <h3>My Active Deliveries</h3>
        <div className="grid">
          {activeOrders.map((order) => (
            <article className="panel" key={order._id}>
              <h4>Order {order._id.slice(-6)}</h4>
              <p>Status: {order.status}</p>
              <p>Customer: {order.customer?.fullName || 'Unknown'}</p>
              <p>Phone: {order.customer?.phone || 'Not provided'}</p>
              <p>Being handled by: {order.assignedRider?.fullName || 'You'}</p>
              <p>Address: {order.deliveryAddress?.fullText || 'Not provided'}</p>

              <div className="row">
                {order.status === 'picked_up' ? (
                  <button
                    className="btn"
                    type="button"
                    onClick={() => updateStatus(order._id, 'on_the_way')}
                    disabled={updatingStatusOrderId === order._id}
                  >
                    {updatingStatusOrderId === order._id ? 'Updating...' : 'Mark On The Way'}
                  </button>
                ) : null}
                {order.status === 'on_the_way' ? (
                  <button
                    className="btn"
                    type="button"
                    onClick={() => updateStatus(order._id, 'arrived')}
                    disabled={updatingStatusOrderId === order._id}
                  >
                    {updatingStatusOrderId === order._id ? 'Updating...' : 'Mark Arrived'}
                  </button>
                ) : null}
              </div>

              {order.status === 'arrived' ? (
                <div style={{ marginTop: '0.75rem' }}>
                  <p className="muted">Customer must provide PIN to complete delivery</p>
                  <div className="row">
                    <input
                      type="password"
                      placeholder="Enter customer PIN"
                      maxLength="4"
                      value={pinInputs[order._id] || ''}
                      onChange={(event) =>
                        setPinInputs((prev) => ({
                          ...prev,
                          [order._id]: event.target.value,
                        }))
                      }
                      style={{ flex: 1, minWidth: '80px' }}
                      disabled={verifyingPinOrderId === order._id}
                    />
                    <button
                      className="btn"
                      type="button"
                      onClick={() => verifyDeliveryPin(order._id)}
                      disabled={verifyingPinOrderId === order._id}
                    >
                      {verifyingPinOrderId === order._id ? 'Verifying...' : 'Verify & Deliver'}
                    </button>
                  </div>
                </div>
              ) : null}
            </article>
          ))}
          {activeOrders.length === 0 ? <p className="muted">No active deliveries yet.</p> : null}
        </div>
      </article>
    </section>
  );
}

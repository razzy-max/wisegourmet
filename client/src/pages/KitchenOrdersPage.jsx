import { useCallback, useEffect, useMemo, useState } from 'react';
import { orderApi } from '../api/orderApi';
import { useOrdersRealtime } from '../hooks/useOrdersRealtime';
import EnableAlertsCard from '../components/EnableAlertsCard';
import PinEntryForm from '../components/PinEntryForm';
import Skeleton from '../components/Skeleton';
import { getStatusLabel, getStatusBadgeClass } from '../utils/statusHelpers';
import { ChefHatIcon, ProfileIcon, CardIcon, UsersIcon, MapPinIcon, TruckIcon, FoodIcon } from '../components/icons';
import './OpsPages.css';

const KITCHEN_STATUSES = ['confirmed', 'preparing'];

export default function KitchenOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingOrderId, setUpdatingOrderId] = useState('');
  const [pickupPins, setPickupPins] = useState({});
  const [verifyingPickupOrderId, setVerifyingPickupOrderId] = useState('');

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

  const verifyPickupPin = async (orderId) => {
    setError('');
    setMessage('');

    const pin = String(pickupPins[orderId] || '').trim();
    if (!pin) {
      setError(`Enter pickup PIN for order ${orderId.slice(-6)}`);
      return;
    }

    setVerifyingPickupOrderId(orderId);
    try {
      await orderApi.verifySelfPickupPin(orderId, pin);
      setMessage(`Self pickup confirmed for order ${orderId.slice(-6)}`);
      setPickupPins((prev) => ({ ...prev, [orderId]: '' }));
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifyingPickupOrderId('');
    }
  };

  return (
    <section className="page-wrap">
      <EnableAlertsCard />
      <h1>Kitchen Dashboard</h1>
      <p className="muted">Manage confirmed orders and move them to ready for pickup/dispatch.</p>
      {message ? <p className="message">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {loading ? <Skeleton variant="card" count={3} /> : null}
      {!loading && kitchenOrders.length === 0 ? <p className="muted">No kitchen orders pending right now.</p> : null}

      <div className="grid">
        {kitchenOrders.map((order, index) => (
          <article
            className={`panel order-card-enter ops-order-card ops-status-${order.status}`}
            key={order._id}
            style={{ '--order-card-delay': `${Math.min(index, 8) * 0.05}s` }}
          >
            <div className="zone-card-top">
              <div className="ops-order-icon-title">
                <span className="icon-badge">
                  <ChefHatIcon size={16} />
                </span>
                <h3>Order {order._id.slice(-6)}</h3>
              </div>
              <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                {getStatusLabel(order.status)}
              </span>
            </div>

            {order.branch?.name ? (
              <span className="ops-branch-pill">
                <MapPinIcon size={12} />
                {order.branch.name}
              </span>
            ) : null}

            <div className="ops-info-grid">
              <div className="ops-info-row">
                <ProfileIcon size={15} />
                <span>{order.customer?.fullName || 'Unknown customer'}</span>
              </div>
              <div className="ops-info-row">
                {order.fulfillmentType === 'self_pickup' ? <FoodIcon size={15} /> : <TruckIcon size={15} />}
                <span>{order.fulfillmentType === 'self_pickup' ? 'Self pickup' : 'Delivery'}</span>
              </div>
              <div className="ops-info-row">
                <CardIcon size={15} />
                <span>₦{Number(order.total || 0).toLocaleString()}</span>
              </div>
              <div className="ops-info-row">
                <UsersIcon size={15} />
                <span className="ops-info-label">Handled by:</span>
                <span>{order.kitchenHandledBy?.fullName || 'Unclaimed yet'}</span>
              </div>
              <div className="ops-info-row">
                <MapPinIcon size={15} />
                <span>
                  {order.fulfillmentType === 'self_pickup'
                    ? 'Pickup at kitchen counter'
                    : order.deliveryAddress?.fullText || 'Address not provided'}
                </span>
              </div>
            </div>

            <div>
              <strong>Items</strong>
              <ul className="ops-items-list">
                {(order.items || []).map((item, index) => (
                  <li key={`${order._id}-${index}`}>
                    <span>{item.name}</span>
                    <span>×{item.quantity}</span>
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
                <PinEntryForm
                  helperText="Verify customer Pickup PIN before completing collection."
                  placeholder="Enter pickup PIN"
                  value={pickupPins[order._id] || ''}
                  onChange={(value) => setPickupPins((prev) => ({ ...prev, [order._id]: value }))}
                  onSubmit={() => verifyPickupPin(order._id)}
                  submitting={verifyingPickupOrderId === order._id}
                  submitLabel="Verify & Complete Pickup"
                  submittingLabel="Verifying..."
                />
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

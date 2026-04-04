import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { orderApi } from '../api/orderApi';
import { useOrdersRealtime } from '../hooks/useOrdersRealtime';
import LoadingSpinner from '../components/LoadingSpinner';
import { getStatusLabel, getStatusBadgeClass, getStepperCircleClass } from '../utils/statusHelpers';

const dedupeTimeline = (timeline = []) => {
  return timeline.filter((entry, index, array) => {
    if (index === 0) return true;
    const previous = array[index - 1];
    return !(previous.status === entry.status && previous.changedAt === entry.changedAt);
  });
};

const statusOrder = [
  'pending',
  'confirmed',
  'preparing',
  'ready_for_pickup',
  'picked_up',
  'on_the_way',
  'arrived',
  'delivered',
];

export default function OrderDetailsPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [copiedPin, setCopiedPin] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');

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

  const copyPin = () => {
    if (order.deliveryPin) {
      navigator.clipboard.writeText(order.deliveryPin);
      setCopiedPin(true);
      setTimeout(() => setCopiedPin(false), 2000);
    }
  };

  const getRiderInitials = (fullName) => {
    if (!fullName) return 'R';
    const parts = fullName.split(' ');
    return (parts[0]?.[0] + (parts[1]?.[0] || '')).toUpperCase();
  };

  const handlePayNow = async () => {
    setPaymentLoading(true);
    setPaymentError('');
    try {
      const response = await orderApi.initiatePayment(id);
      if (response.payment?.authorizationUrl) {
        window.location.href = response.payment.authorizationUrl;
      } else {
        setPaymentError('Payment initiation failed. Please try again.');
      }
    } catch (err) {
      setPaymentError(err.message || 'Failed to initiate payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const isPaymentPending = order && order.status === 'pending' && order.payment?.status !== 'paid';

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
      {/* Header */}
      <div className="order-details-header">
        <div className="order-details-title">
          <h1 style={{ display: 'inline-block', marginRight: '1rem' }}>Order {order._id.slice(-6)}</h1>
          <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
            {getStatusLabel(order.status)}
          </span>
        </div>
        <div className="order-details-actions">
          <Link to={`/support?orderId=${order._id}`} className="btn">
            Get Help For This Order
          </Link>
          <Link to="/orders" className="btn btn-ghost">
            Back to orders
          </Link>
        </div>
      </div>

      {/* Summary & Delivery PIN Grid */}
      <div className="grid order-top-grid">
        {/* Summary Card */}
        <article className="panel order-summary">
          <h3>Order Summary</h3>
          <div className="label-value-grid">
            <div className="label-value-row">
              <span className="label">Status</span>
              <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                {getStatusLabel(order.status)}
              </span>
            </div>
            <div className="label-value-row">
              <span className="label">Payment</span>
              <span className="value">{order.payment?.status || 'N/A'}</span>
            </div>
            <div className="label-value-row">
              <span className="label">Order Total</span>
              <span className="value price">₦{Number(order.total || 0).toLocaleString()}</span>
            </div>
            <div className="label-value-row">
              <span className="label">Delivery Fee</span>
              <span className="value">₦{Number(order.deliveryFee || 0).toLocaleString()}</span>
            </div>
            <div className="label-value-row">
              <span className="label">Payment Ref</span>
              <span className="value">{order.payment?.reference || 'N/A'}</span>
            </div>
            <div className="label-value-row">
              <span className="label">Kitchen Staff</span>
              <span className="value">
                {order.kitchenHandledBy?.fullName || 'Not claimed yet'}
              </span>
            </div>
          </div>
        </article>

        {/* Delivery PIN Card */}
        <article className="panel order-delivery-pin">
          <div className="pin-header">
            <span>🔐 Delivery PIN</span>
            <span className="pin-subtitle">Share with your rider</span>
          </div>
          {order.payment?.status === 'paid' && order.deliveryPin ? (
            <>
              <div className="pin-display" onClick={copyPin}>
                <strong>{order.deliveryPin}</strong>
                <p className="pin-hint" style={{ opacity: copiedPin ? 1 : 0.5 }}>
                  {copiedPin ? '✓ Copied!' : 'Tap to copy'}
                </p>
              </div>
            </>
          ) : (
            <p className="muted">PIN will appear after payment is verified.</p>
          )}
        </article>

        {/* Payment Action Card - Show if payment is pending */}
        {isPaymentPending && (
          <article className="panel order-payment-action">
            <div className="payment-status-header">
              <span className="payment-status-icon" aria-hidden="true">
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
                  <path d="M2.5 10h19" />
                  <path d="M7.5 15h3" />
                </svg>
              </span>
              <span>Complete Payment</span>
            </div>
            <p className="payment-status-info">
              Order total: <strong>₦{Number(order.total || 0).toLocaleString()}</strong>
            </p>
            {paymentError && (
              <div className="error-message" style={{ marginBottom: '1rem' }}>
                {paymentError}
              </div>
            )}
            <button
              className="btn btn-primary order-payment-btn"
              onClick={handlePayNow}
              disabled={paymentLoading}
            >
              {paymentLoading ? 'Processing...' : 'Proceed to Payment'}
            </button>
            <p className="payment-hint">
              You'll be redirected to Paystack to complete the payment securely.
            </p>
          </article>
        )}
      </div>

      {/* Customer & Rider Grid */}
      <div className="grid" style={{ marginTop: '1.5rem' }}>
        {/* Customer & Delivery Card */}
        <article className="panel order-customer">
          <h3>Customer & Delivery Address</h3>
          <div className="address-block">
            <div className="address-item">
              <strong>{order.customer?.fullName || 'Unknown'}</strong>
              {order.customer?.phone && (
                <a href={`tel:${order.customer.phone}`} className="phone-link">
                  {order.customer.phone}
                </a>
              )}
            </div>
            {order.deliveryAddress?.fullText && (
              <div className="address-item">
                <p>{order.deliveryAddress.fullText}</p>
              </div>
            )}
            {order.deliveryAddress?.area && (
              <div className="address-item">
                <span className="label">Area:</span> {order.deliveryAddress.area}
              </div>
            )}
            {order.deliveryAddress?.landmark && (
              <div className="address-item">
                <span className="label">Landmark:</span> {order.deliveryAddress.landmark}
              </div>
            )}
            {order.deliveryAddress?.notes && (
              <div className="address-item">
                <span className="label">Delivery Notes:</span> {order.deliveryAddress.notes}
              </div>
            )}
          </div>
        </article>

        {/* Rider Card */}
        <article className="panel order-rider">
          <h3>Assigned Rider</h3>
          {order.assignedRider ? (
            <div className="rider-card">
              <div className="rider-avatar">{getRiderInitials(order.assignedRider.fullName)}</div>
              <div className="rider-info">
                <h4>{order.assignedRider.fullName}</h4>
                {order.assignedRider.phone && (
                  <a href={`tel:${order.assignedRider.phone}`} className="phone-link">
                    {order.assignedRider.phone}
                  </a>
                )}
                <span className={`status-badge ${getStatusBadgeClass(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>
            </div>
          ) : (
            <p className="muted">No rider assigned yet. Waiting for dispatch.</p>
          )}
        </article>
      </div>

      {/* Status Timeline - Full Width */}
      <article className="panel order-timeline" style={{ marginTop: '1.5rem' }}>
        <h3>Delivery Timeline</h3>
        <div className="status-stepper">
          {statusOrder.map((status, index) => {
            const timelineEntry = timeline.find((t) => t.status === status);
            const isCompleted =
              statusOrder.indexOf(status) < statusOrder.indexOf(order.status);

            return (
              <div key={status} className="stepper-step">
                <div className={`stepper-circle ${getStepperCircleClass(order.status, status)}`}>
                  {isCompleted && <span>✓</span>}
                </div>
                {index < statusOrder.length - 1 && <div className="stepper-line" />}
                <div className="stepper-content">
                  <h4>{status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</h4>
                  {timelineEntry && (
                    <p className="muted">
                      {new Date(timelineEntry.changedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </article>

      {/* Items Card - Full Width */}
      <article className="panel order-items" style={{ marginTop: '1.5rem' }}>
        <h3>Items</h3>
        <div className="items-list">
          {(order.items || []).map((item, index) => (
            <div key={`${item.menuItem || item.name}-${index}`} className="item-row">
              <div className="item-name">{item.name}</div>
              <div className="item-price">
                {item.quantity} × ₦{Number(item.price || 0).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

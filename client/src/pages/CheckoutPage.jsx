import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { orderApi } from '../api/orderApi';
import { cartApi } from '../api/cartApi';
import { authApi } from '../api/authApi';
import { useCart } from '../context/CartContext';

const ZONE_FEES = {
  zone_a: 700,
  zone_b: 1000,
  zone_c: 1500,
  outside: 2000,
};

const getZoneLabel = (zone) => {
  switch (zone) {
    case 'zone_a':
      return 'Zone A';
    case 'zone_b':
      return 'Zone B';
    case 'zone_c':
      return 'Zone C';
    case 'outside':
      return 'Outside';
    default:
      return 'Select zone';
  }
};

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const { refreshCartCount } = useCart();
  const [form, setForm] = useState({
    fullText: '',
    area: '',
    landmark: '',
    notes: '',
    zone: '',
  });
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState({ items: [] });

  const cartItems = cart.items || [];
  const displayedItems = order?.items || cartItems;
  const subtotal = displayedItems.reduce((sum, item) => sum + Number(item.price || item.priceSnapshot || 0) * Number(item.quantity || 0), 0);
  const deliveryFee = order ? Number(order.deliveryFee || 0) : (ZONE_FEES[form.zone] ?? 0);
  const total = order ? Number(order.total || order.totalAmount || subtotal + deliveryFee) : subtotal + deliveryFee;
  const displayedDeliveryFee = order ? Number(order.deliveryFee || 0) : deliveryFee;

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await authApi.me();
        const savedAddress = response.user?.savedAddress || {};
        setForm((prev) => ({
          ...prev,
          fullText: savedAddress.fullText || prev.fullText,
          area: savedAddress.area || prev.area,
          landmark: savedAddress.landmark || prev.landmark,
          notes: savedAddress.notes || prev.notes,
          zone: savedAddress.zone || prev.zone,
        }));
      } catch {
        // ignore profile load failures; checkout remains editable
      }
    };

    loadProfile();
  }, []);

  const loadCart = async () => {
    try {
      const response = await cartApi.get();
      setCart(response.cart || { items: [] });
    } catch {
      setCart({ items: [] });
    }
  };

  useEffect(() => {
    loadCart();
  }, []);

  const handlePaystackCallback = useCallback(async (orderId) => {
    setLoading(true);
    setError('');
    try {
      const orderData = await orderApi.getOrder(orderId);
      const callbackReference = searchParams.get('reference') || searchParams.get('trxref');

      if (orderData.order.payment?.status === 'paid') {
        setOrder(orderData.order);
        setResult('Payment verified successfully!');
      } else {
        const reference = callbackReference || orderData.order.payment?.reference;
        if (!reference) {
          throw new Error('Payment reference not found');
        }

        const response = await orderApi.verifyPayment(orderId, reference);
        setOrder(response.order);
        setResult('Payment verified successfully!');
      }
    } catch (err) {
      setError(`Failed to verify payment: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    const orderId = searchParams.get('orderId');
    if (orderId && !order && !loading) {
      handlePaystackCallback(orderId);
    }
  }, [searchParams, order, loading, handlePaystackCallback]);
  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setResult('');
    setError('');

    if ((cart.items || []).length === 0) {
      setError('Your cart is empty. Add items before checkout.');
      setLoading(false);
      return;
    }

    if (!form.zone) {
      setError('Please select a delivery zone.');
      setLoading(false);
      return;
    }

    try {
      // 1. Create order
      const createResponse = await orderApi.create({
        deliveryMode: 'zone',
        zone: form.zone,
        deliveryAddress: {
          fullText: form.fullText,
          area: form.area,
          landmark: form.landmark,
          notes: form.notes,
          lat: null,
          lng: null,
        },
      });

      const orderId = createResponse.order._id;
      await refreshCartCount();
      await loadCart();
      setOrder(createResponse.order);
      setResult('Order created. Redirecting to Paystack...');

      try {
        await authApi.updateProfile({
          savedAddress: {
            fullText: form.fullText,
            area: form.area,
            landmark: form.landmark,
            notes: form.notes,
            zone: form.zone,
          },
        });
      } catch {
        // profile save is non-blocking for checkout
      }

      // 2. Initiate payment and redirect
      const paymentResponse = await orderApi.initiatePayment(orderId);
      
      if (paymentResponse.payment?.authorizationUrl) {
        // Redirect to Paystack payment page
        window.location.href = paymentResponse.payment.authorizationUrl;
      } else {
        setError('Failed to get payment authorization URL');
        setLoading(false);
      }
    } catch (err) {
      setError(err.message);
      setResult('');
      setLoading(false);
    }
  };

  return (
    <section className="page-wrap checkout-page">
      <h1>Checkout</h1>

      <div className="checkout-layout">
        {!order ? (
          <form className="panel form checkout-form" onSubmit={submit}>
            <h3>Delivery Details</h3>

            <label className="floating-field field-full">
              <textarea
                placeholder=" "
                value={form.fullText}
                onChange={(event) => setForm((prev) => ({ ...prev, fullText: event.target.value }))}
                required
              />
              <span>Full delivery address</span>
            </label>

            <label className="floating-field">
              <input
                placeholder=" "
                value={form.area}
                onChange={(event) => setForm((prev) => ({ ...prev, area: event.target.value }))}
              />
              <span>Area</span>
            </label>

            <label className="floating-field">
              <input
                placeholder=" "
                value={form.landmark}
                onChange={(event) => setForm((prev) => ({ ...prev, landmark: event.target.value }))}
              />
              <span>Landmark</span>
            </label>

            <label className="floating-field field-full">
              <textarea
                placeholder=" "
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
              <span>Notes</span>
            </label>

            <label className="floating-field field-full">
              <select
                value={form.zone}
                onChange={(event) => setForm((prev) => ({ ...prev, zone: event.target.value }))}
                required
              >
                <option value="" disabled>
                  Select zone
                </option>
                <option value="zone_a">Zone A</option>
                <option value="zone_b">Zone B</option>
                <option value="zone_c">Zone C</option>
                <option value="outside">Outside</option>
              </select>
              <span>Delivery zone</span>
            </label>

            <button className="btn checkout-pay-btn" type="submit" disabled={loading}>
              {loading ? 'Processing payment...' : 'Place order & Pay with Paystack'}
            </button>
          </form>
        ) : null}

        <article className="panel checkout-summary">
          <h3>Order Summary</h3>
          <div className="summary-lines">
            {displayedItems.length > 0 ? (
              displayedItems.map((item, index) => (
                <p key={`${item._id || item.menuItem || item.name}-${index}`}>
                  {item.quantity} x {item.nameSnapshot || item.name}
                  <span>₦{Number((item.priceSnapshot || item.price || 0) * item.quantity).toLocaleString()}</span>
                </p>
              ))
            ) : (
              <p>No items to show.</p>
            )}
          </div>
          <hr />
          <p className="summary-total-row">
            Subtotal
            <span>₦{subtotal.toLocaleString()}</span>
          </p>
          <p className="summary-total-row">
            Delivery fee ({getZoneLabel(order?.deliveryRule?.zone || form.zone)})
            <span>₦{displayedDeliveryFee.toLocaleString()}</span>
          </p>
          <hr />
          <p className="summary-total grand-total">
            Total
            <span>₦{total.toLocaleString()}</span>
          </p>
        </article>
      </div>

      {result ? <p className="message">{result}</p> : null}

      {loading && <p className="muted">Processing payment...</p>}

      {order && order.payment?.status === 'paid' ? (
        <div className="panel">
          <p><strong>Order Confirmed:</strong> {order._id}</p>
          <h3>Order summary</h3>
          <ul className="timeline">
            {(order.items || []).map((item, index) => (
              <li key={`${item.menuItem || item.name}-${index}`}>
                {item.quantity} x {item.name} - ₦{Number(item.price || 0).toLocaleString()}
              </li>
            ))}
          </ul>
          <p><strong>Subtotal:</strong> ₦{Number(order.subtotal || 0).toLocaleString()}</p>
          <p><strong>Delivery fee:</strong> ₦{Number(order.deliveryFee || 0).toLocaleString()}</p>
          <p><strong>Zone:</strong> {getZoneLabel(order.deliveryRule?.zone || form.zone)}</p>
          
          {order.deliveryPin && (
            <div style={{
              backgroundColor: '#f0f0f0',
              padding: '20px',
              borderRadius: '8px',
              textAlign: 'center',
              border: '2px solid #333',
              marginTop: '20px',
              marginBottom: '20px'
            }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>
                Your Delivery PIN (share with rider):
              </p>
              <p style={{ margin: '0', fontSize: '36px', fontWeight: 'bold', letterSpacing: '8px', color: '#000' }}>
                {order.deliveryPin}
              </p>
              <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: '#999' }}>
                Rider will ask for this PIN before completing delivery
              </p>
            </div>
          )}

          <p><strong>Status:</strong> {order.status}</p>
          <p><strong>Order Amount:</strong> ₦{order.total ?? order.totalAmount ?? 'N/A'}</p>
        </div>
      ) : null}

      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cartApi } from '../api/cartApi';
import { useCart } from '../context/CartContext';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { BasketIcon, FoodIcon, TrashIcon } from '../components/icons';
import './OrderFlow.css';

export default function CartPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState({ items: [] });
  const [discount, setDiscount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { refreshCartCount } = useCart();

  const load = async () => {
    setLoading(true);
    try {
      const response = await cartApi.get();
      setCart(response.cart || { items: [] });
      setDiscount(response.discount?.discountAmount ? response.discount : null);
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

  const subtotal = useMemo(
    () => cart.items.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0),
    [cart.items]
  );

  const discountAmount = discount?.discountAmount || 0;
  const total = subtotal - discountAmount;

  const hasItems = cart.items.length > 0;

  const removeItem = async (itemId) => {
    await cartApi.remove(itemId);
    await load();
    await refreshCartCount();
  };

  const updateQuantity = async (itemId, quantity) => {
    await cartApi.update(itemId, Math.max(1, Number(quantity) || 1));
    await load();
    await refreshCartCount();
  };

  const removeAppliedDeal = async () => {
    await cartApi.clearPromotion();
    await load();
  };

  return (
    <section className="page-wrap cart-page">
      <h1>Cart</h1>
      {error ? <p className="error">{error}</p> : null}
      {loading ? <Skeleton variant="row" count={3} /> : null}

      {!loading && !hasItems ? (
        <EmptyState
          icon={BasketIcon}
          heading="Your cart is empty"
          subtext="Add something tasty from the menu to get started."
          actionLabel="Browse the menu"
          onAction={() => navigate('/')}
        />
      ) : null}

      {hasItems ? (
        <div className="cart-layout">
          <article className="panel cart-list-panel">
            {cart.items.map((item, index) => (
              <div
                className="cart-item-row"
                key={item._id}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {item.menuItem?.imageUrl ? (
                  <img src={item.menuItem.imageUrl} alt={item.nameSnapshot} className="cart-thumb" loading="lazy" />
                ) : (
                  <div className="cart-thumb cart-thumb-fallback" aria-hidden="true"><FoodIcon size={22} /></div>
                )}
                <div className="cart-item-main">
                  <h3>{item.nameSnapshot}</h3>
                  <p className="price">₦{(item.priceSnapshot * item.quantity).toLocaleString()}</p>
                  <div className="qty-wrap menu-stepper">
                    <button
                      className="btn btn-ghost qty-btn"
                      type="button"
                      onClick={() => updateQuantity(item._id, item.quantity - 1)}
                    >
                      -
                    </button>
                    <input
                      className="qty-input"
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(event) => updateQuantity(item._id, event.target.value)}
                    />
                    <button
                      className="btn btn-ghost qty-btn"
                      type="button"
                      onClick={() => updateQuantity(item._id, item.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
                <button
                  className="icon-btn icon-btn-danger"
                  onClick={() => removeItem(item._id)}
                  type="button"
                  aria-label={`Remove ${item.nameSnapshot}`}
                >
                  <TrashIcon size={16} />
                </button>
              </div>
            ))}
          </article>

          <aside className="panel cart-summary-panel">
            <h3>Order Summary</h3>
            <div className="summary-lines">
              {cart.items.map((item) => (
                <p key={`summary-${item._id}`}>
                  {item.quantity} x {item.nameSnapshot} <span>₦{(item.priceSnapshot * item.quantity).toLocaleString()}</span>
                </p>
              ))}
            </div>
            <hr />
            <p className="summary-total-row">Subtotal <span>₦{subtotal.toLocaleString()}</span></p>
            {discountAmount > 0 ? (
              <>
                <p className="summary-total-row summary-discount-row">
                  Combo Deal — {cart.appliedPromotion?.title} ({cart.appliedPromotion?.discountPercent}% off)
                  <span>-₦{discountAmount.toLocaleString()}</span>
                </p>
                <button className="btn btn-ghost cart-remove-deal-btn" type="button" onClick={removeAppliedDeal}>
                  Remove deal
                </button>
              </>
            ) : null}
            <p className="summary-total grand-total">Total <span>₦{total.toLocaleString()}</span></p>
            <Link to="/checkout" className="btn cart-checkout-btn">
              Proceed to Checkout
            </Link>
          </aside>
        </div>
      ) : null}

      {hasItems ? (
        <div className="cart-mobile-bar">
          <p>
            Total <strong>₦{total.toLocaleString()}</strong>
          </p>
          <Link to="/checkout" className="btn">Checkout</Link>
        </div>
      ) : null}

      {!loading && hasItems && (
        <div className="page-footer">
          <Link to="/" className="footer-suggestion">
            <span className="footer-icon"><FoodIcon size={16} /></span>
            <span>Keep browsing the menu</span>
          </Link>
        </div>
      )}
    </section>
  );
}

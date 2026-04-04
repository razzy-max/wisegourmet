import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { cartApi } from '../api/cartApi';
import { useCart } from '../context/CartContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function CartPage() {
  const [cart, setCart] = useState({ items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { refreshCartCount } = useCart();

  const load = async () => {
    setLoading(true);
    try {
      const response = await cartApi.get();
      setCart(response.cart || { items: [] });
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

  const total = useMemo(
    () => cart.items.reduce((sum, item) => sum + item.priceSnapshot * item.quantity, 0),
    [cart.items]
  );

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

  return (
    <section className="page-wrap cart-page">
      <h1>Cart</h1>
      {error ? <p className="error">{error}</p> : null}
      {loading ? <LoadingSpinner label="Loading cart..." /> : null}

      {!loading && !hasItems ? (
        <article className="panel empty-state">
          <p className="empty-icon" aria-hidden="true">🧺</p>
          <p className="muted">Your cart is empty. Add something tasty from the menu.</p>
        </article>
      ) : null}

      {hasItems ? (
        <div className="cart-layout">
          <article className="panel cart-list-panel">
            {cart.items.map((item) => (
              <div className="cart-item-row" key={item._id}>
                {item.menuItem?.imageUrl ? (
                  <img src={item.menuItem.imageUrl} alt={item.nameSnapshot} className="cart-thumb" loading="lazy" />
                ) : (
                  <div className="cart-thumb cart-thumb-fallback" aria-hidden="true">🍽</div>
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
                  🗑
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
            <p className="summary-total-row">Subtotal <span>₦{total.toLocaleString()}</span></p>
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
            Subtotal <strong>₦{total.toLocaleString()}</strong>
          </p>
          <Link to="/checkout" className="btn">Checkout</Link>
        </div>
      ) : null}

      {!loading && hasItems && (
        <div className="page-footer">
          <Link to="/" className="footer-suggestion">
            <span className="footer-icon">🍽</span>
            <span>Keep browsing the menu</span>
          </Link>
        </div>
      )}
    </section>
  );
}

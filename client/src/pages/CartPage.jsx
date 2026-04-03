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
    <section className="page-wrap">
      <h1>Cart</h1>
      {error ? <p className="error">{error}</p> : null}
      {loading ? <LoadingSpinner label="Loading cart..." /> : null}
      <div className="grid">
        {cart.items.map((item) => (
          <article className="panel" key={item._id}>
            <h3>{item.nameSnapshot}</h3>
            <div className="qty-wrap">
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
            <p>N {(item.priceSnapshot * item.quantity).toLocaleString()}</p>
            <button className="btn btn-danger" onClick={() => removeItem(item._id)} type="button">
              Remove
            </button>
          </article>
        ))}
      </div>
      <p className="total">Subtotal: N {total.toLocaleString()}</p>
      {!loading && cart.items.length === 0 ? <p className="muted">Your cart is empty.</p> : null}
      {!loading && cart.items.length > 0 ? (
        <Link to="/checkout" className="btn" style={{ marginTop: '0.75rem' }}>
          Proceed to checkout
        </Link>
      ) : null}
    </section>
  );
}

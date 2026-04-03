import { useCallback, useEffect, useRef, useState } from 'react';
import { menuApi } from '../api/menuApi';
import { cartApi } from '../api/cartApi';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import LoadingSpinner from '../components/LoadingSpinner';

const normalizeStatus = (item) => item.availabilityStatus || (item.isAvailable ? 'in_stock' : 'unavailable');

const statusLabelMap = {
  in_stock: 'In stock',
  sold_out: 'Sold out',
  unavailable: 'Unavailable',
};

const statusOrder = {
  in_stock: 0,
  sold_out: 1,
  unavailable: 2,
};

export default function HomeMenuPage() {
  const { isAuthenticated, user } = useAuth();
  const { refreshCartCount, adjustCartCount, triggerCartPulse } = useCart();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [feedbackTick, setFeedbackTick] = useState(0);
  const [quantities, setQuantities] = useState({});
  const inFlightAddsRef = useRef(0);
  const refreshTimeoutRef = useRef(null);

  const scheduleCartCountRefresh = useCallback(() => {
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current);
    }

    refreshTimeoutRef.current = setTimeout(async () => {
      if (inFlightAddsRef.current === 0) {
        await refreshCartCount();
      }
    }, 180);
  }, [refreshCartCount]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [menuRes, categoryRes] = await Promise.all([
        menuApi.list({
          category: selectedCategory || undefined,
          search: search || undefined,
        }),
        menuApi.categories(),
      ]);
      const orderedItems = [...(menuRes.items || [])].sort((a, b) => {
        const aRank = statusOrder[normalizeStatus(a)] ?? 99;
        const bRank = statusOrder[normalizeStatus(b)] ?? 99;
        if (aRank !== bRank) {
          return aRank - bRank;
        }
        return String(a.name || '').localeCompare(String(b.name || ''));
      });

      setItems(orderedItems);
      setCategories(categoryRes.categories || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  const setItemQuantity = (itemId, quantity) => {
    setQuantities((prev) => ({
      ...prev,
      [itemId]: Math.max(1, Number(quantity) || 1),
    }));
  };

  const addToCart = async (item) => {
    if (!isAuthenticated || user.role !== 'customer') {
      setMessage('Login as customer to add items to cart.');
      window.scrollTo(0, 0);
      return;
    }

    const quantity = quantities[item._id] || 1;
    setMessage(`${quantity} x ${item.name} added to cart`);
    setFeedbackTick((value) => value + 1);
    adjustCartCount(quantity);
    triggerCartPulse();
    inFlightAddsRef.current += 1;

    try {
      await cartApi.add(item._id, quantity);
    } catch (error) {
      setMessage(error.message);
    } finally {
      inFlightAddsRef.current = Math.max(0, inFlightAddsRef.current - 1);
      scheduleCartCountRefresh();
    }
  };

  return (
    <section className="page-wrap">
      <h1>Menu</h1>
      <div className="panel controls">
        <input
          placeholder="Search food..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category._id} value={category.slug}>
              {category.name}
            </option>
          ))}
        </select>
      </div>
      {message ? (
        <p key={feedbackTick} className="message cart-feedback">
          {message}
        </p>
      ) : null}
      {loading ? <LoadingSpinner label="Loading menu..." /> : null}
      <div className="grid">
        {items.map((item) => (
          <article className="panel" key={item._id}>
            {item.imageUrl ? (
              <img className="menu-item-image" src={item.imageUrl} alt={item.name} loading="lazy" />
            ) : (
              <div className="menu-item-image-placeholder">Food Image</div>
            )}
            <h3>{item.name}</h3>
            <p>{item.description}</p>
            <p className="muted">Category: {item.category?.name}</p>
            <p className="price">N {item.price.toLocaleString()}</p>
            <p className="muted">Status: {statusLabelMap[normalizeStatus(item)] || 'Unknown'}</p>
            {normalizeStatus(item) === 'in_stock' ? (
              <div className="qty-wrap">
                <button
                  className="btn btn-ghost qty-btn"
                  type="button"
                  onClick={() => setItemQuantity(item._id, (quantities[item._id] || 1) - 1)}
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantities[item._id] || 1}
                  onChange={(event) => setItemQuantity(item._id, event.target.value)}
                  className="qty-input"
                />
                <button
                  className="btn btn-ghost qty-btn"
                  type="button"
                  onClick={() => setItemQuantity(item._id, (quantities[item._id] || 1) + 1)}
                >
                  +
                </button>
              </div>
            ) : null}
            <button
              className="btn"
              type="button"
              onClick={() => addToCart(item)}
              disabled={normalizeStatus(item) !== 'in_stock'}
            >
              {normalizeStatus(item) === 'in_stock' ? 'Add to cart' : 'Currently unavailable'}
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { menuApi } from '../api/menuApi';
import { cartApi } from '../api/cartApi';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import LoadingSpinner from '../components/LoadingSpinner';

const MENU_CACHE_TTL_MS = 90 * 1000;
const MENU_CACHE_KEY_PREFIX = 'wg:menu:';
const MENU_CACHE_KEY = `${MENU_CACHE_KEY_PREFIX}all`;
let menuMemoryCache = null;

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

const formatCurrency = (value) => `₦${Number(value || 0).toLocaleString()}`;

const clearMenuCache = () => {
  if (typeof window === 'undefined') {
    return;
  }

  menuMemoryCache = null;
  window.localStorage.removeItem(MENU_CACHE_KEY);
};

const readMenuCache = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    if (menuMemoryCache) {
      return menuMemoryCache;
    }

    const raw = window.localStorage.getItem(MENU_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const cachedItems = Array.isArray(parsed?.data?.items) ? parsed.data.items : null;
    const cachedCategories = Array.isArray(parsed?.data?.categories) ? parsed.data.categories : null;

    // Recover from previously poisoned empty cache snapshots.
    if (cachedItems && cachedCategories && cachedItems.length === 0 && cachedCategories.length === 0) {
      clearMenuCache();
      return null;
    }

    menuMemoryCache = parsed;
    return parsed;
  } catch {
    return null;
  }
};

const writeMenuCache = (payload) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const wrapped = { ts: Date.now(), data: payload };
    menuMemoryCache = wrapped;
    window.localStorage.setItem(MENU_CACHE_KEY, JSON.stringify(wrapped));
  } catch {
    // Ignore storage failures; network fetch still works.
  }
};

export default function HomeMenuPage() {
  const { isAuthenticated, user } = useAuth();
  const { refreshCartCount, adjustCartCount, triggerCartPulse } = useCart();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [menuError, setMenuError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [toastStage, setToastStage] = useState('idle');
  const [quantities, setQuantities] = useState({});
  const inFlightAddsRef = useRef(0);
  const refreshTimeoutRef = useRef(null);
  const toastHoldTimerRef = useRef(null);
  const toastExitTimerRef = useRef(null);
  const greeting =
    new Date().getHours() < 12
      ? 'Good morning'
      : new Date().getHours() < 17
        ? 'Good afternoon'
        : 'Good evening';

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

  const showToast = useCallback((text) => {
    if (toastHoldTimerRef.current) {
      clearTimeout(toastHoldTimerRef.current);
    }

    if (toastExitTimerRef.current) {
      clearTimeout(toastExitTimerRef.current);
    }

    setToastMessage(text);
    setToastStage('enter');

    toastHoldTimerRef.current = setTimeout(() => {
      setToastStage('exit');
      toastExitTimerRef.current = setTimeout(() => {
        setToastMessage('');
        setToastStage('idle');
      }, 300);
    }, 2000);
  }, []);

  const fetchData = useCallback(async ({ force = false } = {}) => {
    const cached = readMenuCache();
    const hasCachedData =
      Array.isArray(cached?.data?.items) &&
      Array.isArray(cached?.data?.categories);
    const cachedItemCount = hasCachedData ? cached.data.items.length : 0;
    const cacheIsFresh = hasCachedData && Date.now() - Number(cached.ts || 0) < MENU_CACHE_TTL_MS;

    setMenuError('');

    if (hasCachedData) {
      setItems(cached.data.items);
      setCategories(cached.data.categories);
    }

    if (!hasCachedData) {
      setLoading(true);
    } else {
      setLoading(false);
    }

    // Always revalidate if cache has no items so a transient failure does not look like a real empty menu.
    if (cacheIsFresh && !force && cachedItemCount > 0) {
      return;
    }

    if (hasCachedData) {
      setRefreshing(true);
    }

    try {
      const [menuResult, categoryResult] = await Promise.allSettled([
        menuApi.list(),
        menuApi.categories(),
      ]);

      if (menuResult.status !== 'fulfilled') {
        throw menuResult.reason;
      }

      const menuRes = menuResult.value;
      const orderedItems = [...(menuRes.items || [])].sort((a, b) => {
        const aRank = statusOrder[normalizeStatus(a)] ?? 99;
        const bRank = statusOrder[normalizeStatus(b)] ?? 99;
        if (aRank !== bRank) {
          return aRank - bRank;
        }
        return String(a.name || '').localeCompare(String(b.name || ''));
      });

      if (orderedItems.length === 0 && !hasCachedData) {
        throw new Error('Menu is temporarily unavailable. Please tap retry.');
      }

      let nextCategories = cached?.data?.categories || [];

      if (categoryResult.status === 'fulfilled') {
        nextCategories = categoryResult.value.categories || [];
      } else if (!hasCachedData) {
        showToast('Menu categories are taking longer than expected.');
      }

      setItems(orderedItems);
      setCategories(nextCategories);
      writeMenuCache({
        items: orderedItems,
        categories: nextCategories,
      });
    } catch (error) {
      if (!hasCachedData || cachedItemCount === 0) {
        setMenuError('Could not load menu. Check your internet connection and tap retry.');
      }
      showToast(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredItems = useMemo(() => {
    const normalizedSearch = String(search || '').trim().toLowerCase();

    return items
      .filter((item) => {
        if (selectedCategory && item.category?.slug !== selectedCategory) {
          return false;
        }

        if (!normalizedSearch) {
          return true;
        }

        const haystack = [item.name, item.description, item.category?.name]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(normalizedSearch);
      })
      .sort((a, b) => {
        const aRank = statusOrder[normalizeStatus(a)] ?? 99;
        const bRank = statusOrder[normalizeStatus(b)] ?? 99;
        if (aRank !== bRank) {
          return aRank - bRank;
        }
        return String(a.name || '').localeCompare(String(b.name || ''));
      });
  }, [items, search, selectedCategory]);

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
      showToast('Login as customer to add items to cart.');
      return;
    }

    const quantity = quantities[item._id] || 1;
    showToast(`${item.name} added to cart!`);
    adjustCartCount(quantity);
    triggerCartPulse();
    inFlightAddsRef.current += 1;

    try {
      await cartApi.add(item._id, quantity);
    } catch (error) {
      showToast(error.message);
    } finally {
      inFlightAddsRef.current = Math.max(0, inFlightAddsRef.current - 1);
      scheduleCartCountRefresh();
    }
  };

  useEffect(() => {
    return () => {
      if (toastHoldTimerRef.current) {
        clearTimeout(toastHoldTimerRef.current);
      }
      if (toastExitTimerRef.current) {
        clearTimeout(toastExitTimerRef.current);
      }
    };
  }, []);

  return (
    <section className="page-wrap">
      <div className="menu-hero">
        <div className="menu-hero-overlay">
          <p>{greeting} 👋</p>
          <h2>What are you craving today?</h2>
        </div>
      </div>
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
      {toastMessage ? (
        <div className={`cart-toast cart-toast-${toastStage}`} role="status" aria-live="polite">
          <span>{toastMessage}</span>
        </div>
      ) : null}
      {loading ? <LoadingSpinner label="Loading menu..." /> : null}
      {!loading && refreshing ? <p className="muted">Refreshing menu in the background...</p> : null}
      {!loading && menuError && filteredItems.length === 0 ? (
        <article className="panel empty-state" style={{ marginTop: '1rem' }}>
          <p className="empty-icon" aria-hidden="true">📶</p>
          <p className="muted">{menuError}</p>
          <button className="btn" type="button" onClick={() => fetchData({ force: true })}>
            Retry
          </button>
        </article>
      ) : null}
      <div className="grid menu-grid">
        {filteredItems.map((item) => (
          <article className="panel menu-card" key={item._id}>
            {item.imageUrl ? (
              <img className="menu-item-image" src={item.imageUrl} alt={item.name} loading="lazy" />
            ) : (
              <div className="menu-item-image-placeholder">Food Image</div>
            )}
            <div className="menu-meta-row">
              <span className="menu-category-pill">🏷 {item.category?.name || 'General'}</span>
              <span className="menu-status-inline">
                <span className={`status-dot ${normalizeStatus(item) === 'in_stock' ? 'in-stock' : 'offline'}`} />
                {statusLabelMap[normalizeStatus(item)] || 'Unknown'}
              </span>
            </div>
            <h3 className="menu-item-title">{item.name}</h3>
            <p>{item.description}</p>
            <p className="price menu-price">{formatCurrency(item.price)}</p>
            {normalizeStatus(item) === 'in_stock' ? (
              <div className="qty-wrap menu-stepper">
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
              className="btn menu-add-btn"
              type="button"
              onClick={() => addToCart(item)}
              disabled={normalizeStatus(item) !== 'in_stock'}
            >
              {normalizeStatus(item) === 'in_stock' ? 'Add to cart' : 'Currently unavailable'}
            </button>
          </article>
        ))}
      </div>
      {!loading && !menuError && filteredItems.length === 0 ? (
        <article className="panel empty-state" style={{ marginTop: '1rem' }}>
          <p className="empty-icon" aria-hidden="true">🍽</p>
          <p className="muted">No menu items match your search or category filter.</p>
        </article>
      ) : null}
    </section>
  );
}

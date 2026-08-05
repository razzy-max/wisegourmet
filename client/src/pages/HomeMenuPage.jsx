import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { menuApi } from '../api/menuApi';
import { cartApi } from '../api/cartApi';
import { promotionApi } from '../api/promotionApi';
import { heroBackgroundApi } from '../api/heroBackgroundApi';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useMenuRealtime } from '../hooks/useMenuRealtime';
import { usePromotionsRealtime } from '../hooks/usePromotionsRealtime';
import { useHeroBackgroundRealtime } from '../hooks/useHeroBackgroundRealtime';
import { useInView } from '../hooks/useInView';
import { buildGreeting } from '../utils/greeting';
import LoadingSpinner from '../components/LoadingSpinner';
import PromoCarousel from '../components/PromoCarousel';
import EnableAlertsCard from '../components/EnableAlertsCard';
import EmptyState from '../components/EmptyState';
import {
  SearchIcon,
  FoodIcon,
  BasketIcon,
  PackageIcon,
  StarIcon,
  TagIcon,
  LeafIcon,
  ChefHatIcon,
  TruckIcon,
  PercentIcon,
  TipIcon,
} from '../components/icons';
import './HomeMenuPage.css';

// Fixed pool of icons to deterministically assign to dynamic, admin-created
// categories. We don't know category names ahead of time, so we can't map
// icons by meaning -- instead every category gets a stable icon + color
// derived from a hash of its identity, so it looks the same on every visit.
const CATEGORY_ICONS = [
  FoodIcon,
  BasketIcon,
  PackageIcon,
  StarIcon,
  TagIcon,
  LeafIcon,
  ChefHatIcon,
  TruckIcon,
  PercentIcon,
  TipIcon,
];

const CATEGORY_TILE_COLORS = ['cat-tile-a', 'cat-tile-b', 'cat-tile-c', 'cat-tile-d', 'cat-tile-e'];

// Small, deterministic string hash (djb2-ish) -- same input always produces
// the same output, so a given category keeps the same icon/color forever.
const hashString = (value) => {
  const str = String(value || '');
  let hash = 5381;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 33 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const getCategoryIcon = (category) => {
  const key = category?._id || category?.name || '';
  return CATEGORY_ICONS[hashString(key) % CATEGORY_ICONS.length];
};

const getCategoryTileColor = (category) => {
  const key = category?._id || category?.name || '';
  return CATEGORY_TILE_COLORS[hashString(`color:${key}`) % CATEGORY_TILE_COLORS.length];
};

function CategoryRail({ categories, selectedCategory, onSelect }) {
  return (
    <div className="cat-rail" role="tablist" aria-label="Filter menu by category">
      <button
        type="button"
        role="tab"
        aria-selected={selectedCategory === ''}
        className={`cat-tile${selectedCategory === '' ? ' cat-tile-active' : ''}`}
        onClick={() => onSelect('')}
      >
        <span className="cat-tile-circle cat-tile-all">
          <StarIcon size={20} />
        </span>
        <span className="cat-tile-label">All</span>
      </button>
      {categories.map((category) => {
        const Icon = getCategoryIcon(category);
        const isActive = selectedCategory === category.slug;
        return (
          <button
            key={category._id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={`cat-tile${isActive ? ' cat-tile-active' : ''}`}
            onClick={() => onSelect(category.slug)}
          >
            <span className={`cat-tile-circle ${getCategoryTileColor(category)}`}>
              <Icon size={20} />
            </span>
            <span className="cat-tile-label">{category.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function PromoSlideContent({ promotion, onApplyCombo }) {
  const isInternalLink = promotion.ctaLink?.startsWith('/');
  const isCombo = promotion.ctaType === 'combo';

  return (
    <>
      <h2>{promotion.title}</h2>
      {promotion.subtitle ? <p>{promotion.subtitle}</p> : null}
      {isCombo ? (
        <button type="button" className="btn promo-cta" onClick={() => onApplyCombo(promotion)}>
          {promotion.ctaLabel || 'Get This Deal'}
        </button>
      ) : promotion.ctaLabel && promotion.ctaLink ? (
        isInternalLink ? (
          <Link className="btn promo-cta" to={promotion.ctaLink}>
            {promotion.ctaLabel}
          </Link>
        ) : (
          <a className="btn promo-cta" href={promotion.ctaLink} target="_blank" rel="noopener noreferrer">
            {promotion.ctaLabel}
          </a>
        )
      ) : null}
    </>
  );
}

function MenuItemCard({ item, quantity, onQuantityChange, onAddToCart }) {
  const [ref, isInView] = useInView({ threshold: 0.15, once: true });
  const status = normalizeStatus(item);
  const inStock = status === 'in_stock';

  return (
    <article
      ref={ref}
      className={`panel menu-card hmp-reveal${isInView ? '' : ' hmp-reveal-pending'}`}
    >
      <div className="menu-image-wrap">
        {item.imageUrl ? (
          <img className="menu-item-image" src={item.imageUrl} alt={item.name} loading="lazy" />
        ) : (
          <div className="menu-item-image-placeholder">Food Image</div>
        )}
        <span className="menu-category-badge">{item.category?.name || 'General'}</span>
      </div>
      <h3 className="menu-item-title">{item.name}</h3>
      <p className="menu-item-desc">{item.description}</p>
      <div className="menu-meta-row">
        <p className="price menu-price">{formatCurrency(item.price)}</p>
        <span className="menu-status-inline">
          <span className={`status-dot ${inStock ? 'in-stock' : 'offline'}`} />
          {statusLabelMap[status] || 'Unknown'}
        </span>
      </div>
      {inStock ? (
        <div className="qty-wrap menu-stepper">
          <button
            className="btn btn-ghost qty-btn"
            type="button"
            onClick={() => onQuantityChange((quantity || 1) - 1)}
          >
            -
          </button>
          <input
            type="number"
            min="1"
            value={quantity || 1}
            onChange={(event) => onQuantityChange(event.target.value)}
            className="qty-input"
          />
          <button
            className="btn btn-ghost qty-btn"
            type="button"
            onClick={() => onQuantityChange((quantity || 1) + 1)}
          >
            +
          </button>
        </div>
      ) : null}
      <button className="btn menu-add-btn" type="button" onClick={onAddToCart} disabled={!inStock}>
        {inStock ? 'Add to cart' : 'Currently unavailable'}
      </button>
    </article>
  );
}

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
  const navigate = useNavigate();
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
  const [promotions, setPromotions] = useState([]);
  const [heroBackground, setHeroBackground] = useState({ imageUrl: '' });
  const greeting = buildGreeting({ isAuthenticated, fullName: user?.fullName });

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

  const fetchData = useCallback(async () => {
    const cached = readMenuCache();
    const cachedItems = Array.isArray(cached?.data?.items) ? cached.data.items : [];
    const cachedCategories = Array.isArray(cached?.data?.categories) ? cached.data.categories : [];
    const cachedItemCount = cachedItems.length;
    const hasCachedData = cachedItemCount > 0;

    setMenuError('');

    if (hasCachedData) {
      setItems(cachedItems);
      setCategories(cachedCategories);
    }

    if (!hasCachedData) {
      setLoading(true);
    } else {
      setLoading(false);
      setRefreshing(true);
    }

    // The cache above is only for an instant first paint — the menu payload is small now
    // (no embedded images), so we always revalidate against the server rather than trusting
    // a time-based cache, which could otherwise show a stale menu after an admin change.

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

      let nextCategories = cachedCategories;

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

  const handleMenuChanged = useCallback(() => {
    fetchData();
  }, [fetchData]);

  useMenuRealtime(handleMenuChanged);

  const fetchPromotions = useCallback(async () => {
    try {
      const response = await promotionApi.list();
      setPromotions(response.promotions || []);
    } catch {
      setPromotions([]);
    }
  }, []);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  usePromotionsRealtime(fetchPromotions);

  const fetchHeroBackground = useCallback(async () => {
    try {
      const response = await heroBackgroundApi.get();
      setHeroBackground({ imageUrl: response.imageUrl || '' });
    } catch {
      setHeroBackground({ imageUrl: '' });
    }
  }, []);

  useEffect(() => {
    fetchHeroBackground();
  }, [fetchHeroBackground]);

  useHeroBackgroundRealtime(fetchHeroBackground);

  const handleApplyCombo = useCallback(
    async (promotion) => {
      if (!isAuthenticated || user.role !== 'customer') {
        showToast('Login as customer to grab this deal.');
        return;
      }

      try {
        await cartApi.applyPromotion(promotion._id);
        await refreshCartCount();
        showToast(`${promotion.title} applied to your cart!`);
        navigate('/cart');
      } catch (error) {
        showToast(error.message);
      }
    },
    [isAuthenticated, user, refreshCartCount, showToast, navigate]
  );

  const slides = useMemo(
    () =>
      promotions.map((promotion) => ({
        id: promotion._id,
        imageUrl: promotion.imageUrl,
        content: <PromoSlideContent promotion={promotion} onApplyCombo={handleApplyCombo} />,
      })),
    [promotions, handleApplyCombo]
  );

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
      <div
        className="menu-hero"
        style={
          heroBackground.imageUrl
            ? {
                backgroundImage: `linear-gradient(rgba(27, 48, 24, 0.55), rgba(27, 48, 24, 0.55)), url(${heroBackground.imageUrl})`,
              }
            : undefined
        }
      >
        <div className="menu-hero-overlay">
          <p>{greeting}</p>
          <h2>What are you craving today?</h2>
        </div>
      </div>
      <PromoCarousel slides={slides} />
      <EnableAlertsCard />
      <h1>Menu</h1>
      <CategoryRail
        categories={categories}
        selectedCategory={selectedCategory}
        onSelect={setSelectedCategory}
      />
      <div className="panel controls">
        <input
          placeholder="Search food..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
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
          <p className="empty-icon" aria-hidden="true">!</p>
          <p className="muted">{menuError}</p>
          <button className="btn" type="button" onClick={() => fetchData()}>
            Retry
          </button>
        </article>
      ) : null}
      <div className="grid menu-grid">
        {filteredItems.map((item) => (
          <MenuItemCard
            key={item._id}
            item={item}
            quantity={quantities[item._id] || 1}
            onQuantityChange={(quantity) => setItemQuantity(item._id, quantity)}
            onAddToCart={() => addToCart(item)}
          />
        ))}
      </div>
      {!loading && !menuError && filteredItems.length === 0 ? (
        <EmptyState
          icon={SearchIcon}
          heading="No items found"
          subtext="No menu items match your search or category filter."
          actionLabel={search || selectedCategory ? 'Clear filters' : undefined}
          onAction={
            search || selectedCategory
              ? () => {
                  setSearch('');
                  setSelectedCategory('');
                }
              : undefined
          }
        />
      ) : null}
    </section>
  );
}

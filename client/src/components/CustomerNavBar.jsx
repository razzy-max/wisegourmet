import { Link, NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function CustomerNavBar() {
  const { logout, isAuthenticated } = useAuth();
  const { cartCount, cartPulse } = useCart();
  const [animateCart, setAnimateCart] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || cartPulse === 0) return;
    setAnimateCart(true);
    const timer = setTimeout(() => setAnimateCart(false), 450);
    return () => clearTimeout(timer);
  }, [cartPulse, isAuthenticated]);

  const renderCartIcon = () => (
    <span className="cart-icon" aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="9" cy="20" r="1" />
        <circle cx="18" cy="20" r="1" />
        <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L21 7H7" />
      </svg>
    </span>
  );

  return (
    <>
      <header className="nav-shell">
        <div className="nav-inner">
          <Link className="brand" to="/">
            <span className="brand-mark" aria-hidden="true">
              🍃
            </span>{' '}
            Wise Gourmet
          </Link>

          <nav className="customer-nav-desktop">
            <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              Menu
            </NavLink>
            {isAuthenticated ? (
              <>
                <NavLink
                  to="/cart"
                  className={({ isActive }) => {
                    const baseClass = isActive ? 'nav-link active cart-link' : 'nav-link cart-link';
                    return animateCart ? `${baseClass} cart-link-pop` : baseClass;
                  }}
                >
                  {renderCartIcon()}
                  <span>Cart</span>
                  {cartCount > 0 ? (
                    <span key={cartCount} className="cart-badge cart-badge-drop" aria-live="polite">
                      {cartCount}
                    </span>
                  ) : null}
                </NavLink>
                <NavLink
                  to="/orders"
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  My Orders
                </NavLink>
                <NavLink
                  to="/profile"
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  Profile
                </NavLink>
                <NavLink
                  to="/support"
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  Support
                </NavLink>
                <button type="button" className="logout-link" onClick={logout}>
                  ⎋ Logout
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
                  Login
                </NavLink>
                <NavLink
                  to="/register"
                  className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
                >
                  Register
                </NavLink>
              </>
            )}
          </nav>

          {isAuthenticated ? (
            <div className="customer-nav-mobile-top">
              <Link to="/cart" className={animateCart ? 'mobile-cart-link cart-link-pop' : 'mobile-cart-link'}>
                {renderCartIcon()}
                {cartCount > 0 ? (
                  <span key={`mobile-${cartCount}`} className="cart-badge cart-badge-drop" aria-live="polite">
                    {cartCount}
                  </span>
                ) : null}
              </Link>
            </div>
          ) : null}
        </div>
      </header>

      {isAuthenticated ? (
        <nav className="mobile-bottom-nav" aria-label="Main mobile navigation">
          <NavLink to="/" className={({ isActive }) => (isActive ? 'mobile-tab active' : 'mobile-tab')}>
            <span aria-hidden="true">🍽</span>
            <span>Menu</span>
          </NavLink>
          <NavLink to="/cart" className={({ isActive }) => (isActive ? 'mobile-tab active' : 'mobile-tab')}>
            <span aria-hidden="true">🛒</span>
            <span>Cart</span>
            {cartCount > 0 ? <span className="mobile-tab-badge">{cartCount}</span> : null}
          </NavLink>
          <NavLink to="/orders" className={({ isActive }) => (isActive ? 'mobile-tab active' : 'mobile-tab')}>
            <span aria-hidden="true">📦</span>
            <span>Orders</span>
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => (isActive ? 'mobile-tab active' : 'mobile-tab')}>
            <span aria-hidden="true">👤</span>
            <span>Profile</span>
          </NavLink>
          <NavLink to="/support" className={({ isActive }) => (isActive ? 'mobile-tab active' : 'mobile-tab')}>
            <span aria-hidden="true">🎫</span>
            <span>Support</span>
          </NavLink>
        </nav>
      ) : null}
    </>
  );
}

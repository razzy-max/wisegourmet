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

  const renderCartIcon = (className = 'cart-icon') => (
    <span className={className} aria-hidden="true">
      <svg
        viewBox="0 0 24 24"
        className="cart-icon-svg"
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

  const renderBottomNavIcon = (iconName) => {
    const icons = {
      menu: (
        <svg viewBox="0 0 24 24" className="mobile-nav-icon-svg" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7h16" />
          <path d="M4 12h16" />
          <path d="M4 17h16" />
        </svg>
      ),
      cart: (
        <svg viewBox="0 0 24 24" className="mobile-nav-icon-svg" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="20" r="1.2" />
          <circle cx="18" cy="20" r="1.2" />
          <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L21 7H7" />
        </svg>
      ),
      orders: (
        <svg viewBox="0 0 24 24" className="mobile-nav-icon-svg" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 4h12l2 4v10H4V8z" />
          <path d="M9 4v4" />
          <path d="M15 4v4" />
        </svg>
      ),
      profile: (
        <svg viewBox="0 0 24 24" className="mobile-nav-icon-svg" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c1.5-3.5 4-5.5 7-5.5s5.5 2 7 5.5" />
        </svg>
      ),
      support: (
        <svg viewBox="0 0 24 24" className="mobile-nav-icon-svg" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12a8 8 0 0 1 16 0" />
          <path d="M4 12v3a3 3 0 0 0 3 3h1v-7H7a3 3 0 0 0-3 3Z" />
          <path d="M20 12v3a3 3 0 0 1-3 3h-1v-7h1a3 3 0 0 1 3 3Z" />
        </svg>
      ),
    };

    return icons[iconName];
  };

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
                  className={() => {
                    const baseClass = 'nav-link cart-link cart-link-primary';
                    return animateCart ? `${baseClass} cart-link-pop` : baseClass;
                  }}
                >
                  {renderCartIcon('cart-icon cart-icon-desktop')}
                  <span className="cart-link-text">Cart</span>
                  {cartCount > 0 ? (
                    <span key={cartCount} className="cart-badge cart-badge-desktop cart-badge-drop" aria-live="polite">
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
                <NavLink
                  to="/login"
                  className={({ isActive }) =>
                    isActive ? 'nav-link guest-login-link active' : 'nav-link guest-login-link'
                  }
                >
                  Login
                </NavLink>
                <NavLink
                  to="/register"
                  className={({ isActive }) =>
                    isActive ? 'nav-link guest-register-link active' : 'nav-link guest-register-link'
                  }
                >
                  Register
                </NavLink>
              </>
            )}
          </nav>

          <div className="customer-nav-mobile-top">
            {isAuthenticated ? (
              <Link to="/cart" className={animateCart ? 'mobile-cart-link cart-link-pop' : 'mobile-cart-link'}>
                <span className="mobile-cart-button">
                  {renderCartIcon('cart-icon cart-icon-mobile')}
                </span>
                {cartCount > 0 ? (
                  <span key={`mobile-${cartCount}`} className="cart-badge cart-badge-mobile cart-badge-drop" aria-live="polite">
                    {cartCount}
                  </span>
                ) : null}
              </Link>
            ) : (
              <div className="mobile-guest-nav-row">
                <NavLink
                  to="/"
                  end
                  className={({ isActive }) =>
                    isActive ? 'mobile-menu-pill mobile-menu-pill-active' : 'mobile-menu-pill'
                  }
                >
                  Menu
                </NavLink>
                <div className="mobile-auth-actions">
                  <Link to="/login" className="mobile-auth-link mobile-auth-link-ghost">
                    Login
                  </Link>
                  <Link to="/register" className="mobile-auth-link mobile-auth-link-solid">
                    Register
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {isAuthenticated ? (
        <nav className="mobile-bottom-nav" aria-label="Main mobile navigation">
          <NavLink to="/" className={({ isActive }) => (isActive ? 'mobile-tab active' : 'mobile-tab')}>
            {renderBottomNavIcon('menu')}
            <span>Menu</span>
          </NavLink>
          <NavLink to="/cart" className={({ isActive }) => (isActive ? 'mobile-tab active' : 'mobile-tab')}>
            {renderBottomNavIcon('cart')}
            <span>Cart</span>
            {cartCount > 0 ? <span className="mobile-tab-badge">{cartCount}</span> : null}
          </NavLink>
          <NavLink to="/orders" className={({ isActive }) => (isActive ? 'mobile-tab active' : 'mobile-tab')}>
            {renderBottomNavIcon('orders')}
            <span>Orders</span>
          </NavLink>
          <NavLink to="/profile" className={({ isActive }) => (isActive ? 'mobile-tab active' : 'mobile-tab')}>
            {renderBottomNavIcon('profile')}
            <span>Profile</span>
          </NavLink>
          <NavLink to="/support" className={({ isActive }) => (isActive ? 'mobile-tab active' : 'mobile-tab')}>
            {renderBottomNavIcon('support')}
            <span>Support</span>
          </NavLink>
        </nav>
      ) : null}
    </>
  );
}

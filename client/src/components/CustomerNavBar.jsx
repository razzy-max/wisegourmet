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

  return (
    <header className="nav-shell">
      <div className="nav-inner">
        <Link className="brand" to="/">
          Wise Gourmet
        </Link>
        <nav>
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
                <span className="cart-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="9" cy="20" r="1" />
                    <circle cx="18" cy="20" r="1" />
                    <path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L21 7H7" />
                  </svg>
                </span>
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
              <button type="button" className="btn btn-ghost" onClick={logout}>
                Logout
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
      </div>
    </header>
  );
}

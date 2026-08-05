import { Link, NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useStoreName } from '../context/StoreSettingsContext';
import ThemeToggle from './ThemeToggle';
import { LeafIcon, CartIcon, MenuIcon, ReceiptIcon, ProfileIcon, SupportIcon, LogoutIcon } from './icons';

export default function CustomerNavBar() {
  const { logout, isAuthenticated } = useAuth();
  const { cartCount, cartPulse } = useCart();
  const storeName = useStoreName();
  const [animateCart, setAnimateCart] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [canInstall, setCanInstall] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || cartPulse === 0) return;
    setAnimateCart(true);
    const timer = setTimeout(() => setAnimateCart(false), 450);
    return () => clearTimeout(timer);
  }, [cartPulse, isAuthenticated]);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

    if (isStandalone) {
      setCanInstall(false);
      return undefined;
    }

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;

    setDeferredPrompt(null);
    setCanInstall(false);
  };

  const renderCartIcon = (className = 'cart-icon') => (
    <span className={className} aria-hidden="true">
      <CartIcon className="cart-icon-svg" size={20} strokeWidth={2} />
    </span>
  );

  const renderBottomNavIcon = (iconName) => {
    const icons = {
      menu: <MenuIcon className="mobile-nav-icon-svg" size={22} strokeWidth={2.2} />,
      cart: <CartIcon className="mobile-nav-icon-svg" size={22} strokeWidth={2.2} />,
      orders: <ReceiptIcon className="mobile-nav-icon-svg" size={22} strokeWidth={2.2} />,
      profile: <ProfileIcon className="mobile-nav-icon-svg" size={22} strokeWidth={2.2} />,
      support: <SupportIcon className="mobile-nav-icon-svg" size={22} strokeWidth={2.2} />,
    };

    return icons[iconName];
  };

  return (
    <>
      <header className="nav-shell">
        <div className="nav-inner">
          <Link className="brand" to="/">
            <span className="brand-mark" aria-hidden="true">
              <LeafIcon size={20} />
            </span>{' '}
            {storeName}
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
                {canInstall ? (
                  <button type="button" className="install-link" onClick={handleInstallClick}>
                    Install App
                  </button>
                ) : null}
                <button type="button" className="logout-link" onClick={logout}>
                  <LogoutIcon size={16} /> Logout
                </button>
                <ThemeToggle />
              </>
            ) : (
              <>
                {canInstall ? (
                  <button type="button" className="install-link" onClick={handleInstallClick}>
                    Install App
                  </button>
                ) : null}
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
                <ThemeToggle />
              </>
            )}
          </nav>

          <div className="customer-nav-mobile-top">
            {isAuthenticated ? (
              <div className="mobile-top-actions">
                {canInstall ? (
                  <button type="button" className="mobile-install-link" onClick={handleInstallClick}>
                    Install
                  </button>
                ) : null}
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
                <ThemeToggle />
              </div>
            ) : (
              <div className="mobile-guest-nav-row">
                {canInstall ? (
                  <button type="button" className="mobile-install-link" onClick={handleInstallClick}>
                    Install
                  </button>
                ) : null}
                <div className="mobile-auth-actions">
                  <Link to="/login" className="mobile-auth-link mobile-auth-link-ghost">
                    Login
                  </Link>
                  <Link to="/register" className="mobile-auth-link mobile-auth-link-solid">
                    Register
                  </Link>
                </div>
                <ThemeToggle />
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

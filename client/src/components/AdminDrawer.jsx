import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminDrawer({ isOpen, onClose }) {
  const { logout } = useAuth();
  const location = useLocation();

  const navItems = [
    { path: '/admin', label: 'Dashboard' },
    { path: '/admin/stats', label: 'Stats' },
    { path: '/admin/menu', label: 'Menu' },
    { path: '/admin/orders', label: 'Orders' },
    { path: '/admin/team', label: 'Team' },
    { path: '/admin/support', label: 'Support' },
    { path: '/admin/zones', label: 'Zones' },
    { path: '/admin/password', label: 'Settings' },
  ];

  const isActive = (path) => {
    if (path === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    onClose();
    logout();
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div className="drawer-overlay" onClick={onClose} aria-hidden="true" />
      )}

      {/* Drawer */}
      <aside className={`admin-drawer ${isOpen ? 'admin-drawer-open' : ''}`} role="navigation">
        <div className="drawer-header">
          <h2 className="drawer-title">Navigation</h2>
          <button
            className="drawer-close-btn"
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
          >
            ✕
          </button>
        </div>

        <nav className="drawer-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`drawer-link ${isActive(item.path) ? 'drawer-link-active' : ''}`}
              onClick={onClose}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="drawer-footer">
          <button
            type="button"
            className="drawer-logout-btn"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

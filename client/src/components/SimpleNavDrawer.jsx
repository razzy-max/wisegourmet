import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SimpleNavDrawer({ isOpen, onClose, links, title = 'Navigation' }) {
  const { logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => location.pathname === path.split('#')[0];

  const handleLogout = () => {
    onClose();
    logout();
  };

  return (
    <>
      {isOpen && <div className="drawer-overlay" onClick={onClose} aria-hidden="true" />}

      <aside className={`admin-drawer ${isOpen ? 'admin-drawer-open' : ''}`} role="navigation">
        <div className="drawer-header">
          <h2 className="drawer-title">{title}</h2>
          <button className="drawer-close-btn" type="button" onClick={onClose} aria-label="Close navigation">
            ✕
          </button>
        </div>

        <nav className="drawer-nav">
          {links.map((item) => (
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
          <button type="button" className="drawer-logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

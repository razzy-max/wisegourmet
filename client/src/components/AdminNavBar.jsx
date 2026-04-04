import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminDrawer from './AdminDrawer';

export default function AdminNavBar() {
  const { logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="nav-shell">
        <div className="nav-inner">
          <Link className="brand admin-brand" to="/admin">
            <span>Wise Gourmet</span>
            <span className="admin-badge">⚙</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="admin-nav-desktop">
            <NavLink
              to="/admin"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/admin/stats"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              Stats
            </NavLink>
            <NavLink
              to="/admin/menu"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              Menu
            </NavLink>
            <NavLink
              to="/admin/orders"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              Orders
            </NavLink>
            <NavLink
              to="/admin/team"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              Team
            </NavLink>
            <NavLink
              to="/admin/support"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              Support
            </NavLink>
            <NavLink
              to="/admin/password"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              Settings
            </NavLink>
            <button type="button" className="logout-link" onClick={logout}>
              Logout
            </button>
          </nav>

          {/* Mobile Hamburger Button */}
          <button
            className="hamburger-btn"
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
          >
            ☰
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      <AdminDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

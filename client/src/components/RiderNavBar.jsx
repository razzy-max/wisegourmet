import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SimpleNavDrawer from './SimpleNavDrawer';
import ThemeToggle from './ThemeToggle';
import { MenuIcon } from './icons';

const NAV_ITEMS = [
  { path: '/rider/queue', label: 'Queue' },
  { path: '/rider/queue#active-deliveries', label: 'Active' },
  { path: '/rider/history', label: 'History' },
];

export default function RiderNavBar() {
  const { logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="nav-shell">
        <div className="nav-inner">
          <Link className="brand" to="/rider/queue">
            Store Name (Dispatch)
          </Link>

          <nav className="admin-nav-desktop">
            <NavLink
              to="/rider/queue"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              Queue
            </NavLink>
            <Link to="/rider/queue#active-deliveries" className="nav-link">
              Active
            </Link>
            <NavLink
              to="/rider/history"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              History
            </NavLink>
            <button type="button" className="btn btn-ghost" onClick={logout}>
              Logout
            </button>
          </nav>

          <ThemeToggle />

          <button
            className="hamburger-btn"
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation menu"
          >
            <MenuIcon />
          </button>
        </div>
      </header>

      <SimpleNavDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        links={NAV_ITEMS}
        title="Dispatch"
      />
    </>
  );
}

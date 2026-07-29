import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SimpleNavDrawer from './SimpleNavDrawer';

const NAV_ITEMS = [
  { path: '/staff/kitchen', label: 'Kitchen' },
  { path: '/staff/history', label: 'History' },
];

export default function StaffNavBar() {
  const { logout } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="nav-shell">
        <div className="nav-inner">
          <Link className="brand" to="/staff/kitchen">
            Wise Gourmet (Kitchen)
          </Link>

          <nav className="admin-nav-desktop">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                {item.label}
              </NavLink>
            ))}
            <button type="button" className="btn btn-ghost" onClick={logout}>
              Logout
            </button>
          </nav>

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

      <SimpleNavDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        links={NAV_ITEMS}
        title="Kitchen"
      />
    </>
  );
}

import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStoreName } from '../context/StoreSettingsContext';
import AdminDrawer from './AdminDrawer';
import ThemeToggle from './ThemeToggle';
import {
  SettingsIcon,
  MenuIcon,
  DashboardIcon,
  ChartIcon,
  FoodIcon,
  PackageIcon,
  PercentIcon,
  UsersIcon,
  TeamIcon,
  ZoneIcon,
  SupportIcon,
  KeyIcon,
  LogoutIcon,
} from './icons';

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: DashboardIcon, end: true },
  { to: '/admin/stats', label: 'Stats', icon: ChartIcon },
  { to: '/admin/menu', label: 'Menu', icon: FoodIcon },
  { to: '/admin/orders', label: 'Orders', icon: PackageIcon },
  { to: '/admin/promotions', label: 'Promotions', icon: PercentIcon },
  { to: '/admin/customers', label: 'Customers', icon: UsersIcon },
  { to: '/admin/team', label: 'Team', icon: TeamIcon },
  { to: '/admin/zones', label: 'Zones', icon: ZoneIcon },
  { to: '/admin/support', label: 'Support', icon: SupportIcon },
  { to: '/admin/password', label: 'Settings', icon: KeyIcon },
];

export default function AdminNavBar() {
  const { logout } = useAuth();
  const storeName = useStoreName();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="admin-sidebar">
        <Link className="admin-sidebar-brand" to="/admin">
          <SettingsIcon size={16} />
          <span>{storeName}</span>
        </Link>

        <nav className="admin-sidebar-nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `admin-sidebar-link${isActive ? ' active' : ''}`}
            >
              <item.icon size={17} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <ThemeToggle />
          <button type="button" className="admin-sidebar-logout" onClick={logout}>
            <LogoutIcon size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="nav-shell admin-mobile-topbar">
        <div className="nav-inner">
          <Link className="brand admin-brand" to="/admin">
            <span>{storeName}</span>
            <span className="admin-badge">
              <SettingsIcon size={14} />
            </span>
          </Link>

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

      <AdminDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}

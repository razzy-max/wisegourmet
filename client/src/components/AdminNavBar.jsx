import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
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
  TagIcon,
  UsersIcon,
  TeamIcon,
  ZoneIcon,
  MapPinIcon,
  SupportIcon,
  KeyIcon,
  LogoutIcon,
} from './icons';

// Every admin-layout role (admin, branch_admin) gets these.
const SHARED_NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: DashboardIcon, end: true },
  { to: '/admin/stats', label: 'Stats', icon: ChartIcon },
  { to: '/admin/menu', label: 'Menu', icon: FoodIcon },
  { to: '/admin/orders', label: 'Orders', icon: PackageIcon },
  { to: '/admin/team', label: 'Team', icon: TeamIcon },
  { to: '/admin/zones', label: 'Zones', icon: ZoneIcon },
  { to: '/admin/password', label: 'Settings', icon: KeyIcon },
];

// Business-wide, shared-catalog, or cross-branch capabilities — owner only.
const OWNER_ONLY_NAV_ITEMS = [
  { to: '/admin/branches', label: 'Branches', icon: MapPinIcon },
  { to: '/admin/promotions', label: 'Promotions', icon: PercentIcon },
  { to: '/admin/promo-codes', label: 'Promo Codes', icon: TagIcon },
  { to: '/admin/customers', label: 'Customers', icon: UsersIcon },
  { to: '/admin/support', label: 'Support', icon: SupportIcon },
];

export default function AdminNavBar() {
  const { user, logout } = useAuth();
  const { branches } = useBranch();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const navItems =
    user?.role === 'admin' ? [...SHARED_NAV_ITEMS, ...OWNER_ONLY_NAV_ITEMS] : SHARED_NAV_ITEMS;
  const myBranchId = user?.role === 'branch_admin' ? user?.branches?.[0] || '' : '';
  const myBranchName = branches.find((branch) => branch._id === myBranchId)?.name;

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="admin-sidebar">
        <Link className="admin-sidebar-brand" to="/admin">
          <SettingsIcon size={16} />
          <span>Wise Gourmet{myBranchName ? ` — ${myBranchName}` : ''}</span>
        </Link>

        <nav className="admin-sidebar-nav">
          {navItems.map((item) => (
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
            <span>Wise Gourmet{myBranchName ? ` — ${myBranchName}` : ''}</span>
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

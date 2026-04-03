import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AdminNavBar() {
  const { logout } = useAuth();

  return (
    <header className="nav-shell">
      <div className="nav-inner">
        <Link className="brand" to="/admin">
          Wise Gourmet (Admin)
        </Link>
        <nav>
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
          <button type="button" className="btn btn-ghost" onClick={logout}>
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}

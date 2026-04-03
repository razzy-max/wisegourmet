import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function StaffNavBar() {
  const { logout } = useAuth();

  return (
    <header className="nav-shell">
      <div className="nav-inner">
        <Link className="brand" to="/staff/kitchen">
          Wise Gourmet (Kitchen)
        </Link>
        <nav>
          <NavLink
            to="/staff/kitchen"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Kitchen
          </NavLink>
          <NavLink
            to="/staff/history"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            History
          </NavLink>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}

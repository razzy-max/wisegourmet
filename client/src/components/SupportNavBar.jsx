import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function SupportNavBar() {
  const { logout } = useAuth();

  return (
    <header className="nav-shell">
      <div className="nav-inner">
        <Link className="brand" to="/admin/support">
          Wise Gourmet (Support)
        </Link>
        <nav>
          <NavLink
            to="/admin/support"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Inbox
          </NavLink>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}
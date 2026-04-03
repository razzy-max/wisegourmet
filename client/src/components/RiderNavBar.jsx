import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RiderNavBar() {
  const { logout } = useAuth();

  return (
    <header className="nav-shell">
      <div className="nav-inner">
        <Link className="brand" to="/rider/queue">
          Wise Gourmet (Dispatch)
        </Link>
        <nav>
          <NavLink
            to="/rider/queue"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Queue
          </NavLink>
          <NavLink
            to="/rider/queue"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Active
          </NavLink>
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
      </div>
    </header>
  );
}

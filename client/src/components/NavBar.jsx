import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const baseLinks = [
  { to: '/', label: 'Menu' },
  { to: '/cart', label: 'Cart' },
  { to: '/checkout', label: 'Checkout' },
  { to: '/orders', label: 'My Orders' },
];

export default function NavBar() {
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header className="nav-shell">
      <div className="nav-inner">
        <Link className="brand" to="/">
          Wise Gourmet
        </Link>
        <nav>
          {baseLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {link.label}
            </NavLink>
          ))}
          {!isAuthenticated ? (
            <>
              <NavLink to="/login" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
                Login
              </NavLink>
              <NavLink
                to="/register"
                className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              >
                Register
              </NavLink>
            </>
          ) : (
            <button type="button" className="btn btn-ghost" onClick={logout}>
              Logout
            </button>
          )}
          {(user?.role === 'admin' || user?.role === 'staff' || user?.role === 'rider') && (
            <NavLink
              to={user?.role === 'rider' ? '/admin/orders' : '/admin'}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {user?.role === 'rider' ? 'Dispatch' : 'Admin'}
            </NavLink>
          )}
          {user?.role === 'admin' && (
            <NavLink
              to="/admin/team"
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              Team
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { useAuth } from '../context/AuthContext';
import { useStoreName } from '../context/StoreSettingsContext';
import { LeafIcon, EyeIcon, EyeOffIcon } from '../components/icons';
import './Auth.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const storeName = useStoreName();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const response = await authApi.login(form);
      login(response);
      switch (response.user.role) {
        case 'admin':
          navigate('/admin');
          break;
        case 'staff':
          navigate('/staff/kitchen');
          break;
        case 'rider':
          navigate('/rider/queue');
          break;
        case 'support':
          navigate('/admin/support');
          break;
        default:
          navigate('/');
          break;
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="page-wrap auth-page">
      <div className="auth-split">
        <div className="auth-panel-brand">
          <div className="auth-brand-lockup">
            <span className="auth-brand-mark" aria-hidden="true">
              <LeafIcon size={22} />
            </span>
            <p className="auth-brand-name">{storeName}</p>
          </div>

          <blockquote className="auth-testimonial">
            <p>
              &ldquo;My jollof rice showed up still steaming and the rider rang before he even
              reached the gate. {storeName} has become my Friday night ritual.&rdquo;
            </p>
            <footer>&mdash; Amaka O., Lekki</footer>
          </blockquote>
        </div>

        <div className="auth-panel-form">
          <div className={`auth-card${error ? ' auth-card-shake' : ''}`}>
            <div className="auth-brand">
              <h1 className="auth-title">Welcome back</h1>
              <p className="auth-tagline">Sign in to track orders and reorder your favorites.</p>
            </div>

            <form onSubmit={submit} className="form auth-form">
              <label className="floating-field">
                <input
                  placeholder=" "
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                  required
                />
                <span>Email</span>
              </label>

              <div className="floating-label-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="login-password"
                  placeholder="placeholder"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  required
                />
                <label htmlFor="login-password">Password</label>
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                </button>
              </div>

              <button className="btn auth-submit-btn" type="submit">
                Sign in
              </button>
            </form>

            {error ? <p className="error auth-error">{error}</p> : null}

            <p className="auth-switch">
              No account? <Link to="/register">Register</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { useAuth } from '../context/AuthContext';
import { LeafIcon, EyeIcon, EyeOffIcon } from '../components/icons';
import './Auth.css';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const response = await authApi.register(form);
      login(response);
      navigate('/');
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
            <p className="auth-brand-name">Store Name</p>
          </div>

          <blockquote className="auth-testimonial">
            <p>
              &ldquo;I signed up on my lunch break and had suya on my desk twenty minutes later.
              Checkout takes under a minute now &mdash; best decision I made all month.&rdquo;
            </p>
            <footer>&mdash; Tunde A., Yaba</footer>
          </blockquote>
        </div>

        <div className="auth-panel-form">
          <div className={`auth-card${error ? ' auth-card-shake' : ''}`}>
            <div className="auth-brand">
              <h1 className="auth-title">Create your account</h1>
              <p className="auth-tagline">Join Store Name for faster checkout and order tracking.</p>
            </div>

            <form onSubmit={submit} className="form auth-form">
              <label className="floating-field">
                <input
                  placeholder=" "
                  value={form.fullName}
                  onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
                  required
                />
                <span>Full Name</span>
              </label>

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

              <label className="floating-field">
                <input
                  placeholder=" "
                  value={form.phone}
                  onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                />
                <span>Phone</span>
              </label>

              <div className="floating-label-field">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="register-password"
                  placeholder="placeholder"
                  value={form.password}
                  onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                  required
                />
                <label htmlFor="register-password">Password</label>
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
                Create account
              </button>
            </form>

            {error ? <p className="error auth-error">{error}</p> : null}

            <p className="auth-switch">
              Have an account? <Link to="/login">Login</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

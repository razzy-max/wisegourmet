import { useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { EyeIcon, EyeOffIcon } from '../components/icons';
import './Auth.css';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submittingRef = useRef(false);

  const submit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) {
      return;
    }
    setError('');
    setMessage('');

    if (!token || !email) {
      setError('This reset link looks incomplete. Please request a new one.');
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    try {
      await authApi.resetPassword({ email, token, newPassword });
      setMessage('Password reset successfully. Redirecting to sign in...');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  return (
    <section className="page-wrap auth-page">
      <div className="auth-split">
        <div className="auth-panel-brand">
          <div className="auth-brand-lockup">
            <img src="/logo.png" alt="Wise Gourmet" className="auth-brand-logo" />
          </div>
          <blockquote className="auth-testimonial">
            <p>
              &ldquo;My jollof rice showed up still steaming and the rider rang before he even
              reached the gate. Wise Gourmet has become my Friday night ritual.&rdquo;
            </p>
            <footer>&mdash; Amaka O., Lekki</footer>
          </blockquote>
        </div>

        <div className="auth-panel-form">
          <div className={`auth-card${error ? ' auth-card-shake' : ''}`}>
            <div className="auth-brand">
              <h1 className="auth-title">Set a new password</h1>
              <p className="auth-tagline">Choose a new password for {email || 'your account'}.</p>
            </div>

            {!message ? (
              <form onSubmit={submit} className="form auth-form">
                <div className="floating-label-field">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="reset-password"
                    placeholder=" "
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    minLength={6}
                    required
                  />
                  <label htmlFor="reset-password">New password</label>
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                  </button>
                </div>

                <button className="btn auth-submit-btn" type="submit" disabled={loading}>
                  {loading ? 'Resetting...' : 'Reset password'}
                </button>
              </form>
            ) : (
              <p className="message">{message}</p>
            )}

            {error ? <p className="error auth-error">{error}</p> : null}

            <p className="auth-switch">
              <Link to="/login">Back to sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

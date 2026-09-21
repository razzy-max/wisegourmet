import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/authApi';
import './Auth.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // React state updates aren't synchronous — a fast double-tap can fire
  // this twice before `loading` re-renders the disabled button, sending
  // two emails for one click. A ref updates immediately, so it catches
  // what the disabled attribute alone misses.
  const submittingRef = useRef(false);

  const submit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) {
      return;
    }
    submittingRef.current = true;
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await authApi.forgotPassword(email);
      setMessage('If that email is registered, a reset link has been sent — check your inbox.');
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
              <h1 className="auth-title">Forgot password?</h1>
              <p className="auth-tagline">Enter your email and we&apos;ll send you a reset link.</p>
            </div>

            {!message ? (
              <form onSubmit={submit} className="form auth-form">
                <label className="floating-field">
                  <input
                    placeholder=" "
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />
                  <span>Email</span>
                </label>

                <button className="btn auth-submit-btn" type="submit" disabled={loading}>
                  {loading ? 'Sending...' : 'Send reset link'}
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

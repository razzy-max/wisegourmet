import { useState } from 'react';
import { authApi } from '../api/authApi';

const getPasswordStrength = (password) => {
  if (!password) return { strength: 0, label: '', color: '' };
  let strength = 0;
  if (password.length >= 8) strength += 1;
  if (password.length >= 12) strength += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 1;
  if (/\d/.test(password)) strength += 1;
  if (/[^a-zA-Z0-9]/.test(password)) strength += 1;

  const strengthLevels = [
    { label: '', color: '' },
    { label: 'Weak', color: '#d32f2f' },
    { label: 'Fair', color: '#f57c00' },
    { label: 'Good', color: '#558b2f' },
    { label: 'Strong', color: '#1976d2' },
    { label: 'Very Strong', color: '#00796b' },
  ];

  return strengthLevels[Math.min(strength, strengthLevels.length - 1)];
};

export default function AdminPasswordPage() {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const passwordStrength = getPasswordStrength(form.newPassword);

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }

    try {
      const response = await authApi.changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setMessage(response.message || 'Password updated successfully.');
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleShow = (field) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <section className="page-wrap panel narrow">
      <h1>Change Admin Password</h1>
      <form className="form password-form" onSubmit={submit}>
        {/* Current Password */}
        <div className="floating-label-field">
          <input
            type={showPasswords.current ? 'text' : 'password'}
            id="current-password"
            placeholder="placeholder"
            value={form.currentPassword}
            onChange={(event) => setForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
            required
          />
          <label htmlFor="current-password">Current password</label>
          <button
            type="button"
            className="password-toggle-btn"
            onClick={() => toggleShow('current')}
            aria-label="Toggle password visibility"
          >
            {showPasswords.current ? '👁' : '👁‍🗨'}
          </button>
        </div>

        {/* New Password with Strength Indicator */}
        <div className="floating-label-field">
          <input
            type={showPasswords.new ? 'text' : 'password'}
            id="new-password"
            placeholder="placeholder"
            value={form.newPassword}
            onChange={(event) => setForm((prev) => ({ ...prev, newPassword: event.target.value }))}
            minLength={6}
            required
          />
          <label htmlFor="new-password">New password</label>
          <button
            type="button"
            className="password-toggle-btn"
            onClick={() => toggleShow('new')}
            aria-label="Toggle password visibility"
          >
            {showPasswords.new ? '👁' : '👁‍🗨'}
          </button>
        </div>

        {/* Password Strength Indicator */}
        {form.newPassword && (
          <div className="password-strength">
            <div className="strength-bar">
              <div
                className="strength-fill"
                style={{
                  width: `${(passwordStrength.strength / 5) * 100}%`,
                  background: passwordStrength.color,
                }}
              />
            </div>
            <p className="strength-label" style={{ color: passwordStrength.color }}>
              Strength: {passwordStrength.label}
            </p>
          </div>
        )}

        {/* Confirm Password */}
        <div className="floating-label-field">
          <input
            type={showPasswords.confirm ? 'text' : 'password'}
            id="confirm-password"
            placeholder="placeholder"
            value={form.confirmPassword}
            onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
            minLength={6}
            required
          />
          <label htmlFor="confirm-password">Confirm new password</label>
          <button
            type="button"
            className="password-toggle-btn"
            onClick={() => toggleShow('confirm')}
            aria-label="Toggle password visibility"
          >
            {showPasswords.confirm ? '👁' : '👁‍🗨'}
          </button>
        </div>

        <button className="btn" type="submit">
          Update Password
        </button>
      </form>
      {message ? <p className="message">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}

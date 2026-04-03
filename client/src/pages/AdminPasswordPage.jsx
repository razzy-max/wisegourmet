import { useState } from 'react';
import { authApi } from '../api/authApi';

export default function AdminPasswordPage() {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

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

  return (
    <section className="page-wrap panel narrow">
      <h1>Change Admin Password</h1>
      <form className="form" onSubmit={submit}>
        <input
          type="password"
          placeholder="Current password"
          value={form.currentPassword}
          onChange={(event) => setForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
          required
        />
        <input
          type="password"
          placeholder="New password"
          value={form.newPassword}
          onChange={(event) => setForm((prev) => ({ ...prev, newPassword: event.target.value }))}
          minLength={6}
          required
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={form.confirmPassword}
          onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
          minLength={6}
          required
        />
        <button className="btn" type="submit">
          Update Password
        </button>
      </form>
      {message ? <p className="message">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}

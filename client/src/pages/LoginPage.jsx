import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

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
    <section className="page-wrap panel narrow">
      <h1>Login</h1>
      <form onSubmit={submit} className="form">
        <input
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          required
        />
        <input
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          required
        />
        <button className="btn" type="submit">
          Sign in
        </button>
      </form>
      {error ? <p className="error">{error}</p> : null}
      <p>
        No account? <Link to="/register">Register</Link>
      </p>
    </section>
  );
}

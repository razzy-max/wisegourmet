import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { useAuth } from '../context/AuthContext';

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
    <section className="page-wrap panel narrow">
      <h1>Register</h1>
      <form onSubmit={submit} className="form">
        <input
          placeholder="Full Name"
          value={form.fullName}
          onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
          required
        />
        <input
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          required
        />
        <input
          placeholder="Phone"
          value={form.phone}
          onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
        />
        <input
          placeholder="Password"
          type="password"
          value={form.password}
          onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
          required
        />
        <button className="btn" type="submit">
          Create account
        </button>
      </form>
      {error ? <p className="error">{error}</p> : null}
      <p>
        Have an account? <Link to="/login">Login</Link>
      </p>
    </section>
  );
}

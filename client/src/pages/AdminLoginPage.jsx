import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { useAuth } from '../context/AuthContext';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (event) => {
    event.preventDefault();
    setError('');

    try {
      const response = await authApi.login({ email, password });
      if (response.user.role !== 'admin') {
        throw new Error('This account is not admin enabled.');
      }
      login(response);
      navigate('/admin');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="page-wrap panel narrow">
      <h1>Admin Login</h1>
      <form className="form" onSubmit={submit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        <button className="btn" type="submit">
          Sign in
        </button>
      </form>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}

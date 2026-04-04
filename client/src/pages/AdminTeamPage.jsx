import { useEffect, useState } from 'react';
import { userApi } from '../api/userApi';

const initialForm = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  role: 'staff',
};

const generatePasswordSuggestion = () => `WG${Date.now().toString(36).slice(-6)}!`;

const getRoleBadge = (role) => {
  const badges = {
    staff: { label: 'Staff', color: 'role-staff' },
    rider: { label: 'Rider', color: 'role-rider' },
    support: { label: 'Support', color: 'role-support' },
  };
  return badges[role] || { label: role, color: 'role-default' };
};

export default function AdminTeamPage() {
  const [form, setForm] = useState(initialForm);
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [latestPassword, setLatestPassword] = useState('');

  const loadTeam = async () => {
    try {
      const response = await userApi.listTeam();
      setUsers(response.users || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadTeam();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    setLatestPassword('');

    try {
      const response = await userApi.createTeamMember(form);
      setMessage(`${response.user.role} account created for ${response.user.email}`);
      setLatestPassword(response.temporaryPassword || '');
      setForm(initialForm);
      await loadTeam();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteMember = async (user) => {
    if (!window.confirm(`Delete ${user.fullName} (${user.role})?`)) {
      return;
    }

    setMessage('');
    setError('');

    try {
      await userApi.deleteTeamMember(user._id);
      setMessage(`Deleted ${user.email}`);
      await loadTeam();
    } catch (err) {
      setError(err.message);
    }
  };

  const resetPassword = async (user) => {
    const generated = generatePasswordSuggestion();
    const newPassword =
      window.prompt(`Set a new password for ${user.email}`, generated) || '';

    if (!newPassword) {
      return;
    }

    setMessage('');
    setError('');
    setLatestPassword('');

    try {
      const response = await userApi.resetTeamMemberPassword(user._id, newPassword);
      setMessage(`Password reset for ${response.user.email}`);
      setLatestPassword(response.temporaryPassword || '');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="page-wrap">
      <h1>Admin Team Manager</h1>
      <article className="panel">
        <h3>Create Staff, Rider, or Support</h3>
        <form className="form" onSubmit={submit}>
          <input
            placeholder="Full name"
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
            placeholder="Temporary password"
            type="password"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            required
          />
          <select
            value={form.role}
            onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
          >
            <option value="staff">Staff</option>
            <option value="rider">Rider</option>
            <option value="support">Support</option>
          </select>
          <button className="btn" type="submit">
            Create account
          </button>
        </form>
        {message ? <p className="message">{message}</p> : null}
        {latestPassword ? <p className="message">Temporary password: {latestPassword}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </article>

      <div className="section-divider" />

      <article className="panel" style={{ marginTop: '1rem' }}>
        <h3>Current Staff and Riders</h3>
        <div className="grid">
          {users.map((user) => (
            <div key={user._id} className="panel team-member-card">
              <div className="member-header">
                <div>
                  <h4>{user.fullName}</h4>
                  <p className="muted">{user.email}</p>
                </div>
                <span className={`role-badge ${getRoleBadge(user.role).color}`}>
                  {getRoleBadge(user.role).label}
                </span>
              </div>

              <div className="member-status">
                <span className="status-dot" style={{ background: user.isActive ? '#3a6835' : '#ccc' }} />
                <span>{user.isActive ? 'Active' : 'Inactive'}</span>
              </div>

              {user.phone && <p className="muted">{user.phone}</p>}

              <div className="row">
                <button className="btn" type="button" onClick={() => resetPassword(user)}>
                  Reset password
                </button>
                <button className="btn btn-danger" type="button" onClick={() => deleteMember(user)}>
                  Delete member
                </button>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}

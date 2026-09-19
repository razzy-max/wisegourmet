import { useEffect, useMemo, useState } from 'react';
import { userApi } from '../api/userApi';
import { branchApi } from '../api/branchApi';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { useInView } from '../hooks/useInView';
import './AdminPolish.css';

function RevealCard({ index, className, children }) {
  const [ref, isInView] = useInView({ threshold: 0.12 });
  return (
    <div
      ref={ref}
      className={`${className} reveal-card${isInView ? ' is-visible' : ''}`}
      style={{ transitionDelay: `${Math.min(index, 8) * 50}ms` }}
    >
      {children}
    </div>
  );
}

const initialForm = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  role: 'staff',
  branches: [],
};

const generatePasswordSuggestion = () => `WG${Date.now().toString(36).slice(-6)}!`;

const getRoleBadge = (role) => {
  const badges = {
    staff: { label: 'Staff', color: 'role-staff' },
    branch_admin: { label: 'Branch Admin', color: 'role-admin' },
    rider: { label: 'Rider', color: 'role-rider' },
    support: { label: 'Support', color: 'role-support' },
  };
  return badges[role] || { label: role, color: 'role-default' };
};

// staff/branch_admin belong to exactly one branch (kitchen work is
// location-bound); rider can cover several (they float between branches).
const isSingleBranchRole = (role) => ['staff', 'branch_admin'].includes(role);
const needsBranches = (role) => ['staff', 'branch_admin', 'rider'].includes(role);

function BranchPicker({ role, branches, allBranches, onChange }) {
  if (!needsBranches(role)) {
    return null;
  }

  if (isSingleBranchRole(role)) {
    return (
      <select value={branches[0] || ''} onChange={(event) => onChange(event.target.value ? [event.target.value] : [])}>
        <option value="">Select branch</option>
        {allBranches.map((branch) => (
          <option key={branch._id} value={branch._id}>
            {branch.name}
          </option>
        ))}
      </select>
    );
  }

  const toggleBranch = (branchId) => {
    if (branches.includes(branchId)) {
      onChange(branches.filter((id) => id !== branchId));
    } else {
      onChange([...branches, branchId]);
    }
  };

  return (
    <div className="branch-checkbox-list">
      <p className="field-label">Branches this rider covers</p>
      {allBranches.map((branch) => (
        <label className="checkbox-row" key={branch._id}>
          <input type="checkbox" checked={branches.includes(branch._id)} onChange={() => toggleBranch(branch._id)} />
          <span>{branch.name}</span>
        </label>
      ))}
    </div>
  );
}

export default function AdminTeamPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'admin';
  // branch_admin only ever assigns their own branch (the server ignores
  // anything else they send), so they don't need — and don't have
  // permission for — the owner's full/inactive-included branch list. The
  // public branch list (already fetched app-wide via BranchContext) is
  // enough for the read-only "which branch is this on" displays they need.
  const { branches: publicBranches } = useBranch();

  const [form, setForm] = useState(initialForm);
  const [users, setUsers] = useState([]);
  const [branches, setBranches] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [latestPassword, setLatestPassword] = useState('');
  const [editingBranchesId, setEditingBranchesId] = useState('');
  const [editingBranches, setEditingBranches] = useState([]);

  const activeBranches = useMemo(() => {
    if (!isOwner) {
      return publicBranches;
    }
    return branches.filter((branch) => branch.isActive !== false);
  }, [isOwner, branches, publicBranches]);

  const loadTeam = async () => {
    try {
      const response = await userApi.listTeam();
      setUsers(response.users || []);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadBranches = async () => {
    if (!isOwner) {
      return;
    }
    try {
      const response = await branchApi.listAdmin();
      setBranches(response.branches || []);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadTeam();
    loadBranches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOwner]);

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

  const startEditBranches = (user) => {
    setEditingBranchesId(user._id);
    setEditingBranches((user.branches || []).map((branch) => branch._id || branch));
  };

  const cancelEditBranches = () => {
    setEditingBranchesId('');
    setEditingBranches([]);
  };

  const saveBranches = async (user) => {
    setMessage('');
    setError('');

    try {
      await userApi.updateTeamMemberBranches(user._id, editingBranches);
      setMessage(`Updated branches for ${user.email}`);
      cancelEditBranches();
      await loadTeam();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="page-wrap">
      <h1>Admin Team Manager</h1>
      <article className="panel">
        <h3>{isOwner ? 'Create Staff, Branch Admin, Rider, or Support' : 'Create Staff or Rider'}</h3>
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
            onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value, branches: [] }))}
          >
            <option value="staff">Staff</option>
            {isOwner ? <option value="branch_admin">Branch Admin</option> : null}
            <option value="rider">Rider</option>
            {isOwner ? <option value="support">Support</option> : null}
          </select>
          {isOwner ? (
            <BranchPicker
              role={form.role}
              branches={form.branches}
              allBranches={activeBranches}
              onChange={(branchIds) => setForm((prev) => ({ ...prev, branches: branchIds }))}
            />
          ) : (
            <p className="muted">Will be added to your branch automatically.</p>
          )}
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
        <h3>Current Team</h3>
        <div className="grid">
          {users.map((user, index) => (
            <RevealCard key={user._id} index={index} className="panel team-member-card">
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
                <span
                  className="status-dot"
                  style={{ background: user.isActive ? 'var(--wg-success)' : 'var(--wg-muted)' }}
                />
                <span>{user.isActive ? 'Active' : 'Inactive'}</span>
              </div>

              {user.phone && <p className="muted">{user.phone}</p>}

              {needsBranches(user.role) ? (
                editingBranchesId === user._id ? (
                  <>
                    <BranchPicker
                      role={user.role}
                      branches={editingBranches}
                      allBranches={activeBranches}
                      onChange={setEditingBranches}
                    />
                    <div className="row">
                      <button className="btn" type="button" onClick={() => saveBranches(user)}>
                        Save
                      </button>
                      <button className="btn btn-ghost" type="button" onClick={cancelEditBranches}>
                        Cancel
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="muted">
                    Branch{(user.branches || []).length === 1 ? '' : 'es'}:{' '}
                    {(user.branches || []).length
                      ? user.branches.map((branch) => branch.name || branch).join(', ')
                      : 'Not assigned yet'}
                  </p>
                )
              ) : null}

              <div className="row">
                {needsBranches(user.role) && editingBranchesId !== user._id ? (
                  <button className="btn btn-ghost" type="button" onClick={() => startEditBranches(user)}>
                    Edit branches
                  </button>
                ) : null}
                <button className="btn" type="button" onClick={() => resetPassword(user)}>
                  Reset password
                </button>
                <button className="btn btn-danger" type="button" onClick={() => deleteMember(user)}>
                  Delete member
                </button>
              </div>
            </RevealCard>
          ))}
        </div>
      </article>
    </section>
  );
}

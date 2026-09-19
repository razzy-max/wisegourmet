import { useCallback, useEffect, useState } from 'react';
import { branchApi } from '../api/branchApi';
import { useBranch } from '../context/BranchContext';
import { useInView } from '../hooks/useInView';
import Skeleton from '../components/Skeleton';
import ToggleSwitch from '../components/ToggleSwitch';
import './AdminPolish.css';

function RevealArticle({ index, className, children }) {
  const [ref, isInView] = useInView({ threshold: 0.12 });
  return (
    <article
      ref={ref}
      className={`${className} reveal-card${isInView ? ' is-visible' : ''}`}
      style={{ transitionDelay: `${Math.min(index, 8) * 50}ms` }}
    >
      {children}
    </article>
  );
}

const blankForm = {
  name: '',
  city: '',
  addressLine: '',
  phone: '',
};

export default function AdminBranchesPage() {
  const { refresh: refreshBranchContext } = useBranch();
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState('');
  const [editForm, setEditForm] = useState(blankForm);
  const [branchingEnabled, setBranchingEnabled] = useState(false);
  const [savingSetting, setSavingSetting] = useState(false);

  const loadBranches = useCallback(async () => {
    setLoading(true);
    try {
      const response = await branchApi.listAdmin();
      setBranches(response.branches || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const response = await branchApi.getSettings();
      setBranchingEnabled(Boolean(response.branchingEnabled));
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    loadBranches();
    loadSettings();
  }, [loadBranches, loadSettings]);

  const toggleBranching = async (event) => {
    const nextValue = event.target.checked;
    setError('');
    setMessage('');
    setSavingSetting(true);

    try {
      const response = await branchApi.updateSettings(nextValue);
      setBranchingEnabled(Boolean(response.branchingEnabled));
      setMessage(response.branchingEnabled ? 'Branching is now on for customers.' : 'Branching is now off.');
      await refreshBranchContext();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingSetting(false);
    }
  };

  const submitNewBranch = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setCreating(true);

    try {
      await branchApi.create(form);
      setMessage('Branch added.');
      setForm(blankForm);
      await loadBranches();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (branch) => {
    setEditingId(branch._id);
    setEditForm({
      name: branch.name,
      city: branch.city,
      addressLine: branch.addressLine || '',
      phone: branch.phone || '',
    });
  };

  const cancelEdit = () => {
    setEditingId('');
    setEditForm(blankForm);
  };

  const saveEdit = async (branchId) => {
    setError('');
    setMessage('');

    try {
      await branchApi.update(branchId, editForm);
      setMessage('Branch updated.');
      cancelEdit();
      await loadBranches();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleActive = async (branch) => {
    setError('');
    setMessage('');

    try {
      await branchApi.update(branch._id, { isActive: !branch.isActive });
      await loadBranches();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeBranch = async (branch) => {
    if (!window.confirm(`Delete "${branch.name}"? Its delivery zones and stock settings will be deleted too. This cannot be undone.`)) {
      return;
    }

    setError('');
    setMessage('');

    try {
      await branchApi.remove(branch._id);
      setMessage('Branch deleted.');
      await loadBranches();
    } catch (err) {
      setError(err.message);
    }
  };

  const moveBranch = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= branches.length) {
      return;
    }

    const reordered = [...branches];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setBranches(reordered);

    try {
      await branchApi.reorder(reordered.map((branch) => branch._id));
      await loadBranches();
    } catch (err) {
      setError(err.message);
      await loadBranches();
    }
  };

  return (
    <section className="page-wrap">
      <h1>Branches</h1>
      <p className="muted">
        Manage the business's physical locations. Each branch gets its own delivery zones, stock, and team.
      </p>

      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="message">{message}</p> : null}
      {loading ? <Skeleton variant="card" count={3} /> : null}

      <article className="panel">
        <h3>Multi-Branch Stock &amp; Fulfillment</h3>
        <ToggleSwitch
          checked={branchingEnabled}
          onChange={toggleBranching}
          disabled={savingSetting}
          label={
            branchingEnabled
              ? 'On — the menu combines both branches’ stock automatically, and orders are routed to whichever branch can fulfill them'
              : 'Off — one shared catalog and stock list, like a single location'
          }
        />
        <p className="muted" style={{ marginTop: '0.5rem' }}>
          Customers never pick a branch themselves — the system figures out which branch fulfills each order behind
          the scenes.
        </p>
      </article>

      <article className="panel" style={{ marginTop: '1rem' }}>
        <h3>Add Branch</h3>
        <form className="form" onSubmit={submitNewBranch}>
          <input
            placeholder="Branch name (e.g. Ekpoma – Poultry Road Junction)"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
          <input
            placeholder="City"
            value={form.city}
            onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))}
            required
          />
          <input
            placeholder="Address (optional)"
            value={form.addressLine}
            onChange={(event) => setForm((prev) => ({ ...prev, addressLine: event.target.value }))}
          />
          <input
            placeholder="Phone (optional)"
            value={form.phone}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
          />
          <button className="btn" type="submit" disabled={creating}>
            {creating ? 'Adding...' : 'Add Branch'}
          </button>
        </form>
      </article>

      <article className="panel" style={{ marginTop: '1rem' }}>
        <h3>Configured Branches</h3>
        <div className="grid">
          {branches.map((branch, index) => (
            <RevealArticle index={index} className="panel zone-card" key={branch._id}>
              {editingId === branch._id ? (
                <div className="form">
                  <input
                    value={editForm.name}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                  <input
                    value={editForm.city}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, city: event.target.value }))}
                  />
                  <input
                    placeholder="Address"
                    value={editForm.addressLine}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, addressLine: event.target.value }))}
                  />
                  <input
                    placeholder="Phone"
                    value={editForm.phone}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, phone: event.target.value }))}
                  />
                  <div className="row">
                    <button className="btn" type="button" onClick={() => saveEdit(branch._id)}>
                      Save
                    </button>
                    <button className="btn btn-ghost" type="button" onClick={cancelEdit}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="zone-card-top">
                    <h4>{branch.name}</h4>
                    <span className={`status-badge ${branch.isActive ? 'status-success' : 'status-muted'}`}>
                      {branch.isActive ? 'Active' : 'Hidden'}
                    </span>
                  </div>
                  <p className="muted">{branch.city}</p>
                  {branch.addressLine ? <p className="muted">{branch.addressLine}</p> : null}
                  {branch.phone ? <p className="muted">{branch.phone}</p> : null}
                  <div className="row">
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => moveBranch(index, -1)}
                      disabled={index === 0}
                    >
                      Move up
                    </button>
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => moveBranch(index, 1)}
                      disabled={index === branches.length - 1}
                    >
                      Move down
                    </button>
                    <button className="btn btn-ghost" type="button" onClick={() => startEdit(branch)}>
                      Edit
                    </button>
                    <button className="btn btn-ghost" type="button" onClick={() => toggleActive(branch)}>
                      {branch.isActive ? 'Hide' : 'Unhide'}
                    </button>
                    <button className="btn btn-danger" type="button" onClick={() => removeBranch(branch)}>
                      Delete
                    </button>
                  </div>
                </>
              )}
            </RevealArticle>
          ))}
        </div>
      </article>
    </section>
  );
}

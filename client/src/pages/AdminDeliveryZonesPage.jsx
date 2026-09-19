import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi } from '../api/adminApi';
import { branchApi } from '../api/branchApi';
import { useAuth } from '../context/AuthContext';
import { useInView } from '../hooks/useInView';
import Skeleton from '../components/Skeleton';
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
  key: '',
  label: '',
  fee: '',
  isActive: true,
};

export default function AdminDeliveryZonesPage() {
  const { user } = useAuth();
  const isOwner = user?.role === 'admin';

  const [zones, setZones] = useState([]);
  const [branches, setBranches] = useState([]);
  const [branchFilter, setBranchFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState('');
  const [editForm, setEditForm] = useState(blankForm);

  useEffect(() => {
    // A branch_admin's zones are inferred server-side from their own
    // account — only the owner needs a picker across every branch.
    if (!isOwner) {
      return;
    }
    branchApi
      .list()
      .then((response) => {
        const activeBranches = response.branches || [];
        setBranches(activeBranches);
        setBranchFilter((current) => current || activeBranches[0]?._id || '');
      })
      .catch((err) => setError(err.message));
  }, [isOwner]);

  const loadZones = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminApi.getDeliveryZones(isOwner ? branchFilter : '');
      setZones(response.zones || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [isOwner, branchFilter]);

  useEffect(() => {
    if (isOwner && !branchFilter) {
      return;
    }
    loadZones();
  }, [loadZones, isOwner, branchFilter]);

  const activeCount = useMemo(() => zones.filter((zone) => zone.isActive).length, [zones]);

  const normalizeKey = (value) =>
    String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

  // Zones with the same key from different branches get merged into one
  // (cheapest fee wins) at checkout — capitalizing consistently keeps the
  // label the customer sees tidy no matter which branch's zone wins.
  const normalizeLabel = (value) =>
    String(value || '')
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const submitNewZone = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setCreating(true);

    try {
      const payload = {
        key: normalizeKey(form.key || form.label),
        label: normalizeLabel(form.label),
        fee: Number(form.fee),
        isActive: Boolean(form.isActive),
        ...(isOwner ? { branch: branchFilter } : {}),
      };

      await adminApi.createDeliveryZone(payload);
      setMessage('Delivery zone added.');
      setForm(blankForm);
      await loadZones();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (zone) => {
    setEditingId(zone._id);
    setEditForm({
      key: zone.key,
      label: zone.label,
      fee: String(zone.fee),
      isActive: zone.isActive,
    });
  };

  const cancelEdit = () => {
    setEditingId('');
    setEditForm(blankForm);
  };

  const saveEdit = async (zoneId) => {
    setError('');
    setMessage('');

    try {
      await adminApi.updateDeliveryZone(zoneId, {
        key: normalizeKey(editForm.key || editForm.label),
        label: normalizeLabel(editForm.label),
        fee: Number(editForm.fee),
        isActive: Boolean(editForm.isActive),
      });
      setMessage('Zone updated.');
      cancelEdit();
      await loadZones();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeZone = async (zoneId) => {
    setError('');
    setMessage('');

    try {
      await adminApi.deleteDeliveryZone(zoneId);
      setMessage('Zone removed.');
      await loadZones();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="page-wrap">
      <h1>Delivery Zones</h1>
      <p className="muted">Manage zone labels and delivery fees used at checkout.</p>

      {isOwner ? (
        <div className="field-label" style={{ marginTop: '0.75rem' }}>
          Branch:{' '}
          <select value={branchFilter} onChange={(event) => setBranchFilter(event.target.value)}>
            {branches.map((branch) => (
              <option key={branch._id} value={branch._id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="message">{message}</p> : null}
      {loading ? <Skeleton variant="card" count={4} /> : null}

      <div className="grid">
        <article className="panel zone-summary-card">
          <h3>Quick Summary</h3>
          <p>
            Active zones: <strong>{activeCount}</strong>
          </p>
          <p>
            Total zones: <strong>{zones.length}</strong>
          </p>
          <p className="muted">Changes apply to new checkouts immediately.</p>
        </article>

        <article className="panel zone-create-card">
          <h3>Add Zone</h3>
          <p className="muted">
            Use the exact same zone name the other branch uses for the same area (e.g. "Zone A") — when both
            branches can deliver there, customers automatically get whichever fee is cheaper.
          </p>
          <form className="form" onSubmit={submitNewZone}>
            <input
              placeholder="Zone label (e.g. Zone D)"
              value={form.label}
              onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
              required
            />
            <input
              placeholder="Zone key (optional, auto-generated)"
              value={form.key}
              onChange={(event) => setForm((prev) => ({ ...prev, key: event.target.value }))}
            />
            <input
              type="number"
              min="0"
              placeholder="Fee"
              value={form.fee}
              onChange={(event) => setForm((prev) => ({ ...prev, fee: event.target.value }))}
              required
            />
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
              />
              <span>Active in checkout</span>
            </label>
            <button className="btn" type="submit" disabled={creating}>
              {creating ? 'Adding...' : 'Add Zone'}
            </button>
          </form>
        </article>
      </div>

      <article className="panel" style={{ marginTop: '1rem' }}>
        <h3>Configured Zones</h3>
        <div className="grid">
          {zones.map((zone, index) => (
            <RevealArticle index={index} className="panel zone-card" key={zone._id || zone.key}>
              {editingId === zone._id ? (
                <div className="form">
                  <input
                    value={editForm.label}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, label: event.target.value }))}
                  />
                  <input
                    value={editForm.key}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, key: event.target.value }))}
                  />
                  <input
                    type="number"
                    min="0"
                    value={editForm.fee}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, fee: event.target.value }))}
                  />
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={editForm.isActive}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, isActive: event.target.checked }))
                      }
                    />
                    <span>Active in checkout</span>
                  </label>
                  <div className="row">
                    <button className="btn" type="button" onClick={() => saveEdit(zone._id)}>
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
                    <h4>{zone.label}</h4>
                    <span className={`status-badge ${zone.isActive ? 'status-success' : 'status-muted'}`}>
                      {zone.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  <p className="muted">Key: {zone.key}</p>
                  <p>
                    Fee: <strong>₦{Number(zone.fee || 0).toLocaleString()}</strong>
                  </p>
                  <div className="row">
                    <button className="btn btn-ghost" type="button" onClick={() => startEdit(zone)}>
                      Edit
                    </button>
                    <button className="btn" type="button" onClick={() => removeZone(zone._id)}>
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

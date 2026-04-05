import { useCallback, useEffect, useMemo, useState } from 'react';
import { adminApi } from '../api/adminApi';
import LoadingSpinner from '../components/LoadingSpinner';

const blankForm = {
  key: '',
  label: '',
  fee: '',
  isActive: true,
};

export default function AdminDeliveryZonesPage() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState('');
  const [editForm, setEditForm] = useState(blankForm);

  const loadZones = useCallback(async () => {
    setLoading(true);
    try {
      const response = await adminApi.getDeliveryZones();
      setZones(response.zones || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadZones();
  }, [loadZones]);

  const activeCount = useMemo(() => zones.filter((zone) => zone.isActive).length, [zones]);

  const normalizeKey = (value) =>
    String(value || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

  const submitNewZone = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setCreating(true);

    try {
      const payload = {
        key: normalizeKey(form.key || form.label),
        label: form.label.trim(),
        fee: Number(form.fee),
        isActive: Boolean(form.isActive),
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
        label: editForm.label.trim(),
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

      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="message">{message}</p> : null}
      {loading ? <LoadingSpinner label="Loading delivery zones..." /> : null}

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
          {zones.map((zone) => (
            <article className="panel zone-card" key={zone._id || zone.key}>
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
            </article>
          ))}
        </div>
      </article>
    </section>
  );
}

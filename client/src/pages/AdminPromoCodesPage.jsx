import { useCallback, useEffect, useState } from 'react';
import { promoCodeApi } from '../api/promoCodeApi';
import { menuApi } from '../api/menuApi';
import Skeleton from '../components/Skeleton';

const blankForm = {
  code: '',
  description: '',
  scope: 'storewide',
  discountType: 'percent',
  discountValue: 10,
  items: [],
  newCustomersOnly: false,
  minOrderValue: 0,
  usageLimitPerUser: 0,
  usageLimitTotal: 0,
  startsAt: '',
  expiresAt: '',
  isActive: true,
};

const toDateInputValue = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

function PromoItemPicker({ menuItems, items, onChange }) {
  const isSelected = (id) => items.some((entry) => entry.menuItem === id);
  const getQuantity = (id) => items.find((entry) => entry.menuItem === id)?.quantity || 1;

  const toggleItem = (id) => {
    if (isSelected(id)) {
      onChange(items.filter((entry) => entry.menuItem !== id));
    } else {
      onChange([...items, { menuItem: id, quantity: 1 }]);
    }
  };

  const setQuantity = (id, quantity) => {
    onChange(items.map((entry) => (entry.menuItem === id ? { ...entry, quantity: Math.max(1, Number(quantity) || 1) } : entry)));
  };

  return (
    <div className="combo-item-picker">
      {menuItems.length === 0 ? <p className="muted">No menu items available yet.</p> : null}
      {menuItems.map((item) => (
        <div className="combo-item-row" key={item._id}>
          <label className="checkbox-row">
            <input type="checkbox" checked={isSelected(item._id)} onChange={() => toggleItem(item._id)} />
            <span>{item.name}</span>
          </label>
          {isSelected(item._id) ? (
            <input
              type="number"
              min="1"
              className="qty-input"
              value={getQuantity(item._id)}
              onChange={(event) => setQuantity(item._id, event.target.value)}
            />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function PromoCodeFields({ form, setForm, menuItems }) {
  return (
    <>
      <input
        placeholder="Code (e.g. WELCOME10)"
        value={form.code}
        onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
        required
      />
      <input
        placeholder="Description (admin note, optional)"
        value={form.description}
        onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
      />
      <select value={form.scope} onChange={(event) => setForm((prev) => ({ ...prev, scope: event.target.value }))}>
        <option value="storewide">Applies to: whole order</option>
        <option value="items">Applies to: specific items</option>
      </select>
      {form.scope === 'items' ? (
        <>
          <p className="muted">Select the items this code discounts (a customer must have them in cart).</p>
          <PromoItemPicker
            menuItems={menuItems}
            items={form.items}
            onChange={(items) => setForm((prev) => ({ ...prev, items }))}
          />
        </>
      ) : null}
      <div className="row">
        <select
          value={form.discountType}
          onChange={(event) => setForm((prev) => ({ ...prev, discountType: event.target.value }))}
        >
          <option value="percent">% off</option>
          <option value="fixed">₦ off (fixed amount)</option>
        </select>
        <input
          type="number"
          min="0"
          max={form.discountType === 'percent' ? 100 : undefined}
          placeholder="Discount value"
          value={form.discountValue}
          onChange={(event) => setForm((prev) => ({ ...prev, discountValue: event.target.value }))}
          required
        />
      </div>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={form.newCustomersOnly}
          onChange={(event) => setForm((prev) => ({ ...prev, newCustomersOnly: event.target.checked }))}
        />
        <span>First-time customers only (no paid orders yet)</span>
      </label>
      <div className="field-label">Minimum order value (₦, 0 = none)</div>
      <input
        type="number"
        min="0"
        value={form.minOrderValue}
        onChange={(event) => setForm((prev) => ({ ...prev, minOrderValue: event.target.value }))}
      />
      <div className="row">
        <div style={{ flex: 1 }}>
          <div className="field-label">Uses per customer (0 = unlimited)</div>
          <input
            type="number"
            min="0"
            value={form.usageLimitPerUser}
            onChange={(event) => setForm((prev) => ({ ...prev, usageLimitPerUser: event.target.value }))}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div className="field-label">Total uses allowed (0 = unlimited)</div>
          <input
            type="number"
            min="0"
            value={form.usageLimitTotal}
            onChange={(event) => setForm((prev) => ({ ...prev, usageLimitTotal: event.target.value }))}
          />
        </div>
      </div>
      <div className="row">
        <div style={{ flex: 1 }}>
          <div className="field-label">Starts (optional)</div>
          <input
            type="date"
            value={form.startsAt}
            onChange={(event) => setForm((prev) => ({ ...prev, startsAt: event.target.value }))}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div className="field-label">Expires (optional)</div>
          <input
            type="date"
            value={form.expiresAt}
            onChange={(event) => setForm((prev) => ({ ...prev, expiresAt: event.target.value }))}
          />
        </div>
      </div>
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
        />
        <span>Active</span>
      </label>
    </>
  );
}

const describePromoCode = (promoCode) => {
  const parts = [];
  parts.push(promoCode.scope === 'items' ? 'Specific items' : 'Whole order');
  parts.push(
    promoCode.discountType === 'percent' ? `${promoCode.discountValue}% off` : `₦${promoCode.discountValue.toLocaleString()} off`
  );
  if (promoCode.newCustomersOnly) parts.push('First-time customers only');
  if (promoCode.minOrderValue > 0) parts.push(`Min order ₦${promoCode.minOrderValue.toLocaleString()}`);
  if (promoCode.usageLimitPerUser > 0) parts.push(`${promoCode.usageLimitPerUser}/customer`);
  if (promoCode.usageLimitTotal > 0) parts.push(`${promoCode.usageCount}/${promoCode.usageLimitTotal} used`);
  else if (promoCode.usageCount > 0) parts.push(`${promoCode.usageCount} used`);
  return parts.join(' · ');
};

export default function AdminPromoCodesPage() {
  const [promoCodes, setPromoCodes] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState('');
  const [editForm, setEditForm] = useState(blankForm);

  useEffect(() => {
    menuApi
      .list()
      .then((response) => setMenuItems(response.items || []))
      .catch(() => setMenuItems([]));
  }, []);

  const loadPromoCodes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await promoCodeApi.listAdmin();
      setPromoCodes(response.promoCodes || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPromoCodes();
  }, [loadPromoCodes]);

  const buildPayload = (source) => ({
    code: source.code.trim().toUpperCase(),
    description: source.description.trim(),
    scope: source.scope,
    discountType: source.discountType,
    discountValue: Number(source.discountValue) || 0,
    items: source.scope === 'items' ? source.items : [],
    newCustomersOnly: Boolean(source.newCustomersOnly),
    minOrderValue: Number(source.minOrderValue) || 0,
    usageLimitPerUser: Number(source.usageLimitPerUser) || 0,
    usageLimitTotal: Number(source.usageLimitTotal) || 0,
    startsAt: source.startsAt || null,
    expiresAt: source.expiresAt || null,
    isActive: Boolean(source.isActive),
  });

  const submitNewPromoCode = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setCreating(true);

    try {
      await promoCodeApi.create(buildPayload(form));
      setMessage('Promo code created.');
      setForm(blankForm);
      await loadPromoCodes();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (promoCode) => {
    setEditingId(promoCode._id);
    setEditForm({
      code: promoCode.code,
      description: promoCode.description || '',
      scope: promoCode.scope,
      discountType: promoCode.discountType,
      discountValue: promoCode.discountValue,
      items: (promoCode.items || []).map((entry) => ({
        menuItem: entry.menuItem?._id || entry.menuItem,
        quantity: entry.quantity,
      })),
      newCustomersOnly: promoCode.newCustomersOnly,
      minOrderValue: promoCode.minOrderValue,
      usageLimitPerUser: promoCode.usageLimitPerUser,
      usageLimitTotal: promoCode.usageLimitTotal,
      startsAt: toDateInputValue(promoCode.startsAt),
      expiresAt: toDateInputValue(promoCode.expiresAt),
      isActive: promoCode.isActive,
    });
  };

  const cancelEdit = () => {
    setEditingId('');
    setEditForm(blankForm);
  };

  const saveEdit = async (id) => {
    setError('');
    setMessage('');
    try {
      await promoCodeApi.update(id, buildPayload(editForm));
      setMessage('Promo code updated.');
      cancelEdit();
      await loadPromoCodes();
    } catch (err) {
      setError(err.message);
    }
  };

  const removePromoCode = async (id) => {
    setError('');
    setMessage('');
    try {
      await promoCodeApi.remove(id);
      setMessage('Promo code deleted.');
      await loadPromoCodes();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="page-wrap">
      <h1>Promo Codes</h1>
      <p className="muted">
        Create codes customers can type at checkout — storewide discounts for holidays/celebrations, or tied to
        specific menu items, with optional eligibility conditions like first-time-customer only.
      </p>

      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="message">{message}</p> : null}
      {loading ? <Skeleton variant="card" count={3} /> : null}

      <article className="panel">
        <h3>New Promo Code</h3>
        <form className="form" onSubmit={submitNewPromoCode}>
          <PromoCodeFields form={form} setForm={setForm} menuItems={menuItems} />
          <button className="btn" type="submit" disabled={creating}>
            {creating ? 'Creating...' : 'Create Promo Code'}
          </button>
        </form>
      </article>

      <article className="panel" style={{ marginTop: '1rem' }}>
        <h3>Existing Promo Codes</h3>
        <div className="grid">
          {promoCodes.map((promoCode) => (
            <article className="panel" key={promoCode._id}>
              {editingId === promoCode._id ? (
                <div className="form">
                  <PromoCodeFields form={editForm} setForm={setEditForm} menuItems={menuItems} />
                  <div className="row">
                    <button className="btn" type="button" onClick={() => saveEdit(promoCode._id)}>
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
                    <h4>{promoCode.code}</h4>
                    <span className={`status-badge ${promoCode.isActive ? 'status-success' : 'status-muted'}`}>
                      {promoCode.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  {promoCode.description ? <p className="muted">{promoCode.description}</p> : null}
                  <p>{describePromoCode(promoCode)}</p>
                  {promoCode.scope === 'items' ? (
                    <p className="muted">
                      Items: {(promoCode.items || []).map((entry) => `${entry.quantity}x ${entry.menuItem?.name || 'item'}`).join(', ')}
                    </p>
                  ) : null}
                  {(promoCode.startsAt || promoCode.expiresAt) ? (
                    <p className="muted">
                      {promoCode.startsAt ? `From ${new Date(promoCode.startsAt).toLocaleDateString()}` : ''}
                      {promoCode.startsAt && promoCode.expiresAt ? ' — ' : ''}
                      {promoCode.expiresAt ? `Until ${new Date(promoCode.expiresAt).toLocaleDateString()}` : ''}
                    </p>
                  ) : null}
                  <div className="row">
                    <button className="btn btn-ghost" type="button" onClick={() => startEdit(promoCode)}>
                      Edit
                    </button>
                    <button className="btn" type="button" onClick={() => removePromoCode(promoCode._id)}>
                      Delete
                    </button>
                  </div>
                </>
              )}
            </article>
          ))}
          {!loading && promoCodes.length === 0 ? <p className="muted">No promo codes yet.</p> : null}
        </div>
      </article>
    </section>
  );
}

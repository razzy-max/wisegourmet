import { useCallback, useEffect, useState } from 'react';
import { promotionApi } from '../api/promotionApi';
import { heroBackgroundApi } from '../api/heroBackgroundApi';
import { menuApi } from '../api/menuApi';
import { usePromotionsRealtime } from '../hooks/usePromotionsRealtime';
import { useInView } from '../hooks/useInView';
import { filesToAttachments } from '../utils/attachments';
import Skeleton from '../components/Skeleton';
import { UploadIcon } from '../components/icons';
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
  title: '',
  subtitle: '',
  ctaLabel: '',
  ctaLink: '',
  ctaType: 'link',
  comboItems: [],
  comboDiscountPercent: 10,
  imageUrl: '',
  isActive: true,
};

function ComboItemPicker({ menuItems, comboItems, onChange }) {
  const isSelected = (id) => comboItems.some((entry) => entry.menuItem === id);
  const getQuantity = (id) => comboItems.find((entry) => entry.menuItem === id)?.quantity || 1;

  const toggleItem = (id) => {
    if (isSelected(id)) {
      onChange(comboItems.filter((entry) => entry.menuItem !== id));
    } else {
      onChange([...comboItems, { menuItem: id, quantity: 1 }]);
    }
  };

  const setQuantity = (id, quantity) => {
    onChange(
      comboItems.map((entry) =>
        entry.menuItem === id ? { ...entry, quantity: Math.max(1, Number(quantity) || 1) } : entry
      )
    );
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

export default function AdminPromotionsPage() {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [editingId, setEditingId] = useState('');
  const [editForm, setEditForm] = useState(blankForm);
  const [editImageChanged, setEditImageChanged] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState('');
  const [heroSaving, setHeroSaving] = useState(false);
  const [heroMessage, setHeroMessage] = useState('');
  const [menuItems, setMenuItems] = useState([]);

  useEffect(() => {
    menuApi
      .list()
      .then((response) => setMenuItems(response.items || []))
      .catch(() => setMenuItems([]));
  }, []);

  const toImageDataUrl = async (fileList) => {
    const attachments = await filesToAttachments(fileList || []);
    return attachments[0]?.dataUrl || '';
  };

  const loadPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await promotionApi.listAdmin();
      setPromotions(response.promotions || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPromotions();
  }, [loadPromotions]);

  usePromotionsRealtime(loadPromotions);

  const loadHeroBackground = useCallback(async () => {
    try {
      const response = await heroBackgroundApi.get();
      setHeroImageUrl(response.imageUrl || '');
    } catch {
      setHeroImageUrl('');
    }
  }, []);

  useEffect(() => {
    loadHeroBackground();
  }, [loadHeroBackground]);

  const handleHeroImageUpload = async (event) => {
    try {
      const dataUrl = await toImageDataUrl(event.target.files || []);
      if (dataUrl) {
        setHeroImageUrl(dataUrl);
      }
      event.target.value = '';
    } catch (err) {
      setHeroMessage(err.message);
    }
  };

  const saveHeroBackground = async () => {
    setHeroSaving(true);
    setHeroMessage('');
    try {
      const response = await heroBackgroundApi.update({ imageUrl: heroImageUrl });
      setHeroImageUrl(response.imageUrl || '');
      setHeroMessage('Greeting banner background updated.');
    } catch (err) {
      setHeroMessage(err.message);
    } finally {
      setHeroSaving(false);
    }
  };

  const resetHeroBackground = async () => {
    setHeroSaving(true);
    setHeroMessage('');
    try {
      await heroBackgroundApi.update({ imageUrl: '' });
      setHeroImageUrl('');
      setHeroMessage('Reset to default background.');
    } catch (err) {
      setHeroMessage(err.message);
    } finally {
      setHeroSaving(false);
    }
  };

  const submitNewPromotion = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setCreating(true);

    try {
      await promotionApi.create({
        title: form.title.trim(),
        subtitle: form.subtitle.trim(),
        ctaLabel: form.ctaLabel.trim(),
        ctaLink: form.ctaType === 'combo' ? '' : form.ctaLink.trim(),
        ctaType: form.ctaType,
        comboItems: form.ctaType === 'combo' ? form.comboItems : [],
        comboDiscountPercent: form.ctaType === 'combo' ? Number(form.comboDiscountPercent) || 0 : 0,
        imageUrl: form.imageUrl,
        isActive: Boolean(form.isActive),
      });
      setMessage('Promotion added.');
      setForm(blankForm);
      await loadPromotions();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateImageUpload = async (event) => {
    try {
      const dataUrl = await toImageDataUrl(event.target.files || []);
      if (dataUrl) {
        setForm((prev) => ({ ...prev, imageUrl: dataUrl }));
      }
      event.target.value = '';
    } catch (err) {
      setError(err.message);
    }
  };

  const startEdit = (promotion) => {
    setEditingId(promotion._id);
    setEditImageChanged(false);
    setEditForm({
      title: promotion.title || '',
      subtitle: promotion.subtitle || '',
      ctaLabel: promotion.ctaLabel || '',
      ctaLink: promotion.ctaLink || '',
      ctaType: promotion.ctaType === 'combo' ? 'combo' : 'link',
      comboItems: (promotion.comboItems || []).map((entry) => ({
        menuItem: entry.menuItem?._id || entry.menuItem,
        quantity: entry.quantity,
      })),
      comboDiscountPercent: promotion.comboDiscountPercent || 10,
      imageUrl: promotion.imageUrl || '',
      isActive: promotion.isActive,
    });
  };

  const cancelEdit = () => {
    setEditingId('');
    setEditImageChanged(false);
    setEditForm(blankForm);
  };

  const handleEditImageUpload = async (event) => {
    try {
      const dataUrl = await toImageDataUrl(event.target.files || []);
      if (dataUrl) {
        setEditForm((prev) => ({ ...prev, imageUrl: dataUrl }));
        setEditImageChanged(true);
      }
      event.target.value = '';
    } catch (err) {
      setError(err.message);
    }
  };

  const saveEdit = async (promotionId) => {
    setError('');
    setMessage('');

    try {
      const payload = {
        title: editForm.title.trim(),
        subtitle: editForm.subtitle.trim(),
        ctaLabel: editForm.ctaLabel.trim(),
        ctaLink: editForm.ctaType === 'combo' ? '' : editForm.ctaLink.trim(),
        ctaType: editForm.ctaType,
        comboItems: editForm.ctaType === 'combo' ? editForm.comboItems : [],
        comboDiscountPercent: editForm.ctaType === 'combo' ? Number(editForm.comboDiscountPercent) || 0 : 0,
        isActive: Boolean(editForm.isActive),
      };
      if (editImageChanged) {
        payload.imageUrl = editForm.imageUrl;
      }

      await promotionApi.update(promotionId, payload);
      setMessage('Promotion updated.');
      cancelEdit();
      await loadPromotions();
    } catch (err) {
      setError(err.message);
    }
  };

  const removePromotion = async (promotionId) => {
    setError('');
    setMessage('');

    try {
      await promotionApi.remove(promotionId);
      setMessage('Promotion removed.');
      await loadPromotions();
    } catch (err) {
      setError(err.message);
    }
  };

  const movePromotion = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= promotions.length) {
      return;
    }

    const reordered = [...promotions];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];

    setError('');
    setMessage('');

    try {
      await promotionApi.reorder(reordered.map((promotion) => promotion._id));
      await loadPromotions();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="page-wrap">
      <h1>Homepage Promotions</h1>
      <p className="muted">Manage the promo slides shown in the homepage carousel.</p>

      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="message">{message}</p> : null}
      {loading ? <Skeleton variant="card" count={4} /> : null}

      <article className="panel">
        <h3>Greeting Banner Background</h3>
        <p className="muted">
          Optional background photo for the greeting block at the top of the homepage. Leave unset to use the
          default.
        </p>
        {heroMessage ? <p className="message">{heroMessage}</p> : null}
        <div className="form">
          {heroImageUrl ? (
            <img className="hero-background-preview" src={heroImageUrl} alt="Greeting banner background" loading="lazy" />
          ) : (
            <div className="hero-background-preview">Using default background</div>
          )}
          <label className="upload-zone" htmlFor="hero-background-image">
            <p className="upload-icon" aria-hidden="true"><UploadIcon size={28} /></p>
            <p>Drag files here or click to upload.</p>
          </label>
          <input
            id="hero-background-image"
            type="file"
            accept="image/*"
            onChange={handleHeroImageUpload}
            className="hidden-file-input"
          />
          <div className="row">
            <button className="btn" type="button" onClick={saveHeroBackground} disabled={heroSaving}>
              {heroSaving ? 'Saving...' : 'Save'}
            </button>
            <button className="btn btn-ghost" type="button" onClick={resetHeroBackground} disabled={heroSaving}>
              Reset to default
            </button>
          </div>
        </div>
      </article>

      <article className="panel" style={{ marginTop: '1rem' }}>
        <h3>Add Promotion</h3>
        <form className="form" onSubmit={submitNewPromotion}>
          <input
            placeholder="Title"
            value={form.title}
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            required
          />
          <textarea
            placeholder="Subtitle (optional)"
            value={form.subtitle}
            onChange={(event) => setForm((prev) => ({ ...prev, subtitle: event.target.value }))}
          />
          <input
            placeholder="Image URL (optional)"
            value={form.imageUrl}
            onChange={(event) => setForm((prev) => ({ ...prev, imageUrl: event.target.value }))}
          />
          <label className="upload-zone" htmlFor="create-promo-image">
            <p className="upload-icon" aria-hidden="true"><UploadIcon size={28} /></p>
            <p>Drag files here or click to upload.</p>
          </label>
          <input
            id="create-promo-image"
            type="file"
            accept="image/*"
            onChange={handleCreateImageUpload}
            className="hidden-file-input"
          />
          <input
            placeholder="CTA button label (optional, e.g. Order Now)"
            value={form.ctaLabel}
            onChange={(event) => setForm((prev) => ({ ...prev, ctaLabel: event.target.value }))}
          />
          <select
            value={form.ctaType}
            onChange={(event) => setForm((prev) => ({ ...prev, ctaType: event.target.value }))}
          >
            <option value="link">CTA: Link</option>
            <option value="combo">CTA: Combo Deal</option>
          </select>
          {form.ctaType === 'combo' ? (
            <>
              <p className="muted">Select the items that make up this combo and the discount to apply.</p>
              <ComboItemPicker
                menuItems={menuItems}
                comboItems={form.comboItems}
                onChange={(comboItems) => setForm((prev) => ({ ...prev, comboItems }))}
              />
              <input
                type="number"
                min="0"
                max="100"
                placeholder="Discount % off the combo"
                value={form.comboDiscountPercent}
                onChange={(event) => setForm((prev) => ({ ...prev, comboDiscountPercent: event.target.value }))}
              />
            </>
          ) : (
            <input
              placeholder="CTA link (optional, e.g. / or https://...)"
              value={form.ctaLink}
              onChange={(event) => setForm((prev) => ({ ...prev, ctaLink: event.target.value }))}
            />
          )}
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
            />
            <span>Active</span>
          </label>
          <button className="btn" type="submit" disabled={creating}>
            {creating ? 'Adding...' : 'Add Promotion'}
          </button>
        </form>
      </article>

      <article className="panel" style={{ marginTop: '1rem' }}>
        <h3>Configured Promotions</h3>
        <div className="grid">
          {promotions.map((promotion, index) => (
            <RevealArticle index={index} className="panel" key={promotion._id}>
              {editingId === promotion._id ? (
                <>
                  {editForm.imageUrl ? (
                    <img
                      className="promo-image-preview"
                      src={editForm.imageUrl}
                      alt={editForm.title}
                      loading="lazy"
                    />
                  ) : (
                    <div className="menu-item-image-placeholder">No Image</div>
                  )}
                  <div className="form">
                    <input
                      placeholder="Title"
                      value={editForm.title}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
                    />
                    <textarea
                      placeholder="Subtitle"
                      value={editForm.subtitle}
                      onChange={(event) =>
                        setEditForm((prev) => ({ ...prev, subtitle: event.target.value }))
                      }
                    />
                    <input
                      placeholder="Image URL (optional)"
                      value={editForm.imageUrl}
                      onChange={(event) => {
                        setEditForm((prev) => ({ ...prev, imageUrl: event.target.value }));
                        setEditImageChanged(true);
                      }}
                    />
                    <label className="upload-zone" htmlFor={`edit-promo-image-${promotion._id}`}>
                      <p className="upload-icon" aria-hidden="true"><UploadIcon size={28} /></p>
                      <p>Drag files here or click to upload.</p>
                    </label>
                    <input
                      id={`edit-promo-image-${promotion._id}`}
                      type="file"
                      accept="image/*"
                      onChange={handleEditImageUpload}
                      className="hidden-file-input"
                    />
                    <input
                      placeholder="CTA button label"
                      value={editForm.ctaLabel}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, ctaLabel: event.target.value }))}
                    />
                    <select
                      value={editForm.ctaType}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, ctaType: event.target.value }))}
                    >
                      <option value="link">CTA: Link</option>
                      <option value="combo">CTA: Combo Deal</option>
                    </select>
                    {editForm.ctaType === 'combo' ? (
                      <>
                        <p className="muted">Select the items that make up this combo and the discount to apply.</p>
                        <ComboItemPicker
                          menuItems={menuItems}
                          comboItems={editForm.comboItems}
                          onChange={(comboItems) => setEditForm((prev) => ({ ...prev, comboItems }))}
                        />
                        <input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="Discount % off the combo"
                          value={editForm.comboDiscountPercent}
                          onChange={(event) =>
                            setEditForm((prev) => ({ ...prev, comboDiscountPercent: event.target.value }))
                          }
                        />
                      </>
                    ) : (
                      <input
                        placeholder="CTA link"
                        value={editForm.ctaLink}
                        onChange={(event) => setEditForm((prev) => ({ ...prev, ctaLink: event.target.value }))}
                      />
                    )}
                    <label className="checkbox-row">
                      <input
                        type="checkbox"
                        checked={editForm.isActive}
                        onChange={(event) =>
                          setEditForm((prev) => ({ ...prev, isActive: event.target.checked }))
                        }
                      />
                      <span>Active</span>
                    </label>
                  </div>
                  <div className="row">
                    <button className="btn" type="button" onClick={() => saveEdit(promotion._id)}>
                      Save
                    </button>
                    <button className="btn btn-ghost" type="button" onClick={cancelEdit}>
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {promotion.imageUrl ? (
                    <img className="promo-image-preview" src={promotion.imageUrl} alt={promotion.title} loading="lazy" />
                  ) : (
                    <div className="menu-item-image-placeholder">No Image</div>
                  )}
                  <div className="zone-card-top">
                    <h4>{promotion.title}</h4>
                    <span className={`status-badge ${promotion.isActive ? 'status-success' : 'status-muted'}`}>
                      {promotion.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </div>
                  {promotion.subtitle ? <p className="muted">{promotion.subtitle}</p> : null}
                  {promotion.ctaType === 'combo' ? (
                    <p>
                      Combo: {(promotion.comboItems || [])
                        .map((entry) => `${entry.quantity}x ${entry.menuItem?.name || 'item'}`)
                        .join(', ')}{' '}
                      — {promotion.comboDiscountPercent}% off
                    </p>
                  ) : promotion.ctaLabel ? (
                    <p>
                      CTA: <strong>{promotion.ctaLabel}</strong> → {promotion.ctaLink}
                    </p>
                  ) : null}
                  <div className="row">
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => movePromotion(index, -1)}
                      disabled={index === 0}
                    >
                      Move up
                    </button>
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={() => movePromotion(index, 1)}
                      disabled={index === promotions.length - 1}
                    >
                      Move down
                    </button>
                    <button className="btn btn-ghost" type="button" onClick={() => startEdit(promotion)}>
                      Edit
                    </button>
                    <button className="btn" type="button" onClick={() => removePromotion(promotion._id)}>
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

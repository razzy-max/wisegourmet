import { useState } from 'react';
import { storeSettingsApi } from '../api/storeSettingsApi';
import { useStoreSettings } from '../context/StoreSettingsContext';

export default function ControlStoreNamePage() {
  const { storeName, refresh } = useStoreSettings();
  const [value, setValue] = useState(storeName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const trimmed = value.trim();

    if (!trimmed) {
      setError('Enter a name.');
      return;
    }

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const response = await storeSettingsApi.update({ storeName: trimmed });
      setValue(response.storeName);
      await refresh();
      setMessage('Saved. It should now show everywhere in the app.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="page-wrap panel narrow" style={{ marginTop: '3rem' }}>
      <h1>Store name control</h1>
      <p className="muted">
        This changes the business name shown across the whole app — nav bars, page titles, and
        notification text. There's no link to this page anywhere in the UI on purpose; bookmark
        the URL if you need it again.
      </p>
      <form className="form" onSubmit={submit} style={{ marginTop: '1rem' }}>
        <label className="field">
          <span className="field-label">Store name</span>
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            maxLength={60}
            placeholder="e.g. Mama Nkechi's Kitchen"
            required
          />
        </label>
        <button className="btn" type="submit" disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </form>
      {message ? <p className="message">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      <p className="muted" style={{ marginTop: '1.5rem', fontSize: '0.85rem' }}>
        Two things this can't reach without a redeploy: the browser tab's very first title flash
        before the page finishes loading, and the name shown under the icon if someone has
        already installed the app to their home screen. Everything else — nav bars, in-app page
        titles, checkout copy, and all push notification text — updates immediately.
      </p>
    </section>
  );
}

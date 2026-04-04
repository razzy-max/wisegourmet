import { useEffect, useState } from 'react';
import { authApi } from '../api/authApi';

const initialForm = {
  fullName: '',
  phone: '',
  savedAddress: {
    fullText: '',
    area: '',
    landmark: '',
    notes: '',
    zone: '',
  },
};

export default function ProfilePage() {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const initials = form.fullName
    .split(' ')
    .map((value) => value.trim().charAt(0).toUpperCase())
    .filter(Boolean)
    .slice(0, 2)
    .join('') || 'WG';

  const loadProfile = async () => {
    try {
      const response = await authApi.me();
      setForm({
        fullName: response.user?.fullName || '',
        phone: response.user?.phone || '',
        savedAddress: {
          fullText: response.user?.savedAddress?.fullText || '',
          area: response.user?.savedAddress?.area || '',
          landmark: response.user?.savedAddress?.landmark || '',
          notes: response.user?.savedAddress?.notes || '',
          zone: response.user?.savedAddress?.zone || '',
        },
      });
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const startEditing = () => {
    setMessage('');
    setError('');
    setIsEditing(true);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!isEditing) {
      startEditing();
      return;
    }

    setMessage('');
    setError('');

    try {
      await authApi.updateProfile(form);
      await loadProfile();
      setIsEditing(false);
      setMessage('Profile updated successfully');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <section className="page-wrap panel narrow profile-card">
      <div className="profile-header">
        <div className="profile-avatar" aria-hidden="true">{initials}</div>
        <h1>My Profile</h1>
      </div>
      <form className="form profile-form" onSubmit={saveProfile}>
        <label className="field">
          <span className="field-label">Full name</span>
          <input
            value={form.fullName}
            disabled={!isEditing}
            onChange={(event) => setForm((prev) => ({ ...prev, fullName: event.target.value }))}
          />
        </label>
        <label className="field">
          <span className="field-label">Phone number</span>
          <input
            value={form.phone}
            disabled={!isEditing}
            onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
          />
        </label>
        <label className="field field-full">
          <span className="field-label">Saved delivery address</span>
          <textarea
            value={form.savedAddress.fullText}
            disabled={!isEditing}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                savedAddress: { ...prev.savedAddress, fullText: event.target.value },
              }))
            }
          />
        </label>
        <label className="field">
          <span className="field-label">Area</span>
          <input
            value={form.savedAddress.area}
            disabled={!isEditing}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                savedAddress: { ...prev.savedAddress, area: event.target.value },
              }))
            }
          />
        </label>
        <label className="field">
          <span className="field-label">Zone</span>
          <select
            value={form.savedAddress.zone}
            disabled={!isEditing}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                savedAddress: { ...prev.savedAddress, zone: event.target.value },
              }))
            }
          >
            <option value="">Select zone</option>
            <option value="zone_a">Zone A</option>
            <option value="zone_b">Zone B</option>
            <option value="zone_c">Zone C</option>
            <option value="outside">Outside</option>
          </select>
        </label>
        <label className="field">
          <span className="field-label">Landmark</span>
          <input
            value={form.savedAddress.landmark}
            disabled={!isEditing}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                savedAddress: { ...prev.savedAddress, landmark: event.target.value },
              }))
            }
          />
        </label>
        <label className="field field-full">
          <span className="field-label">Address note</span>
          <textarea
            value={form.savedAddress.notes}
            disabled={!isEditing}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                savedAddress: { ...prev.savedAddress, notes: event.target.value },
              }))
            }
          />
        </label>
        <div className="profile-actions field-full">
          <button className="btn" type="submit">
            {isEditing ? 'Save Profile' : 'Edit Profile'}
          </button>
        </div>
      </form>
      {message ? <p className="message">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}

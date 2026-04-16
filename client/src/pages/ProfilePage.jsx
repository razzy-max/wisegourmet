import { useEffect, useMemo, useState } from 'react';
import { orderApi } from '../api/orderApi';
import { authApi } from '../api/authApi';
import { userApi } from '../api/userApi';
import { useAuth } from '../context/AuthContext';

const formatZoneLabel = (zoneKey) =>
  String(zoneKey || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
};

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
  const { logout, isAuthenticated } = useAuth();
  const [form, setForm] = useState(initialForm);
  const [zones, setZones] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(true);
  const [notificationsSupported, setNotificationsSupported] = useState(true);
  const [notificationsConfigured, setNotificationsConfigured] = useState(false);
  const [notificationsPublicKey, setNotificationsPublicKey] = useState('');
  const [notificationsSubscribed, setNotificationsSubscribed] = useState(false);
  const [notificationsBusy, setNotificationsBusy] = useState(false);
  const [notificationsMessage, setNotificationsMessage] = useState('');
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

  const loadZones = async () => {
    try {
      const response = await orderApi.deliveryZones();
      setZones(response.zones || []);
    } catch {
      setZones([]);
    }
  };

  const loadNotificationStatus = async () => {
    if (!isAuthenticated) {
      setNotificationsLoading(false);
      return;
    }

    const pushSupported =
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window;

    if (!pushSupported) {
      setNotificationsSupported(false);
      setNotificationsLoading(false);
      return;
    }

    try {
      const [configRes, registration] = await Promise.all([
        userApi.notificationConfig(),
        navigator.serviceWorker.ready,
      ]);

      const deviceSubscription = await registration.pushManager.getSubscription();
      const statusRes = await userApi.notificationStatus(deviceSubscription?.endpoint || '');

      setNotificationsConfigured(Boolean(configRes.enabled));
      setNotificationsPublicKey(String(configRes.publicKey || ''));
      setNotificationsSubscribed(Boolean(statusRes.subscribed));
      setNotificationsMessage('');
    } catch (err) {
      setNotificationsMessage(err.message || 'Unable to load notification settings right now.');
    } finally {
      setNotificationsLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
    loadZones();
    loadNotificationStatus();
  }, []);

  const zoneOptions = useMemo(() => {
    const savedZone = form.savedAddress.zone;
    const activeZones = zones.filter((zone) => zone.isActive !== false);

    if (savedZone && !activeZones.some((zone) => zone.key === savedZone)) {
      return [
        {
          key: savedZone,
          label: `${formatZoneLabel(savedZone)} (saved)`,
          isActive: false,
        },
        ...activeZones,
      ];
    }

    return activeZones;
  }, [form.savedAddress.zone, zones]);

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

  const enableNotifications = async () => {
    if (!notificationsPublicKey || !notificationsConfigured) {
      setNotificationsMessage('Notifications are not configured yet.');
      return;
    }

    setNotificationsBusy(true);
    setNotificationsMessage('');

    try {
      const permission = await window.Notification.requestPermission();
      if (permission !== 'granted') {
        setNotificationsMessage('Notification permission was not granted.');
        setNotificationsBusy(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(notificationsPublicKey),
        });
      }

      await userApi.subscribeNotifications(subscription.toJSON());
      setNotificationsSubscribed(true);
      setNotificationsMessage('Notifications enabled for this device.');
    } catch (err) {
      setNotificationsMessage(err.message || 'Could not enable notifications. Please try again.');
    } finally {
      setNotificationsBusy(false);
    }
  };

  const disableNotifications = async () => {
    setNotificationsBusy(true);
    setNotificationsMessage('');

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      const endpoint = subscription?.endpoint || '';

      await userApi.unsubscribeNotifications(endpoint);

      if (subscription) {
        await subscription.unsubscribe();
      }

      setNotificationsSubscribed(false);
      setNotificationsMessage('Notifications disabled for this device.');
    } catch (err) {
      setNotificationsMessage(err.message || 'Could not disable notifications right now.');
    } finally {
      setNotificationsBusy(false);
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
            {zoneOptions.map((zone) => (
              <option
                key={zone.key}
                value={zone.key}
                disabled={zone.isActive === false && zone.key !== form.savedAddress.zone}
              >
                {zone.label}
              </option>
            ))}
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
      <div className="profile-logout">
        <button type="button" className="btn btn-ghost" onClick={logout}>
          Logout
        </button>
      </div>
      <article className="panel" style={{ marginTop: '1rem' }}>
        <h3>Notifications</h3>
        {notificationsLoading ? <p className="muted">Checking notification status...</p> : null}
        {!notificationsLoading && !notificationsSupported ? (
          <p className="muted">This browser does not support push notifications.</p>
        ) : null}
        {!notificationsLoading && notificationsSupported && !notificationsConfigured ? (
          <p className="muted">Notifications are currently unavailable on the server.</p>
        ) : null}
        {!notificationsLoading && notificationsSupported && notificationsConfigured ? (
          <>
            <p className="muted">
              Status: <strong>{notificationsSubscribed ? 'Enabled on this device' : 'Disabled on this device'}</strong>
            </p>
            <div className="row" style={{ marginTop: '0.75rem' }}>
              {notificationsSubscribed ? (
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={disableNotifications}
                  disabled={notificationsBusy}
                >
                  {notificationsBusy ? 'Disabling...' : 'Disable Notifications'}
                </button>
              ) : (
                <button
                  type="button"
                  className="btn"
                  onClick={enableNotifications}
                  disabled={notificationsBusy}
                >
                  {notificationsBusy ? 'Enabling...' : 'Enable Notifications'}
                </button>
              )}
            </div>
          </>
        ) : null}
        {notificationsMessage ? <p className="muted" style={{ marginTop: '0.75rem' }}>{notificationsMessage}</p> : null}
      </article>
      {message ? <p className="message">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../api/userApi';

const DISMISS_KEY = 'wg:alerts-card:dismissed:';

const roleCopy = {
  customer: {
    title: 'Enable Order Alerts',
    description: 'Get notified as soon as your order moves from confirmed to delivery and completion.',
  },
  staff: {
    title: 'Enable New Order Alerts',
    description: 'Get notified when new orders are placed or paid so kitchen operations can respond fast.',
  },
  rider: {
    title: 'Enable Dispatch Alerts',
    description: 'Get notified when deliveries are ready for pickup or assigned to you.',
  },
  support: {
    title: 'Enable Support Alerts',
    description: 'Get notified when new support tickets arrive or customers reply.',
  },
};

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

export default function EnableAlertsCard() {
  const { user, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [supported, setSupported] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [publicKey, setPublicKey] = useState('');
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [dismissed, setDismissed] = useState(false);

  const copy = useMemo(() => roleCopy[user?.role] || null, [user?.role]);

  const loadStatus = useCallback(async () => {
    if (!isAuthenticated || !user?.role || user.role === 'admin') {
      setLoading(false);
      return;
    }

    const alreadyDismissed = window.localStorage.getItem(`${DISMISS_KEY}${user.role}`) === '1';
    setDismissed(alreadyDismissed);

    const pushSupported =
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window;

    if (!pushSupported) {
      setSupported(false);
      setLoading(false);
      return;
    }

    try {
      const [configRes, registration] = await Promise.all([
        userApi.notificationConfig(),
        navigator.serviceWorker.ready,
      ]);

      const deviceSubscription = await registration.pushManager.getSubscription();
      const statusRes = await userApi.notificationStatus(deviceSubscription?.endpoint || '');

      setEnabled(Boolean(configRes.enabled));
      setPublicKey(String(configRes.publicKey || ''));
      setSubscribed(Boolean(statusRes.subscribed));
    } catch (error) {
      setMessage(error.message || 'Unable to check notification status right now.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleEnable = async () => {
    if (!publicKey) {
      setMessage('Notifications are not configured yet.');
      return;
    }

    setBusy(true);
    setMessage('');

    try {
      const permission = await window.Notification.requestPermission();
      if (permission !== 'granted') {
        setMessage('Notification permission was not granted.');
        setBusy(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }

      await userApi.subscribeNotifications(subscription.toJSON());
      setSubscribed(true);
      setMessage('Alerts enabled. You will now receive important updates.');
    } catch (error) {
      setMessage(error.message || 'Could not enable alerts. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleDismiss = () => {
    if (user?.role) {
      window.localStorage.setItem(`${DISMISS_KEY}${user.role}`, '1');
    }
    setDismissed(true);
  };

  if (!isAuthenticated || !copy || loading || dismissed || subscribed) {
    return null;
  }

  if (!supported) {
    return null;
  }

  if (!enabled) {
    return null;
  }

  return (
    <article className="panel alerts-optin-card" role="region" aria-label="Enable notifications">
      <h3>{copy.title}</h3>
      <p className="muted">{copy.description}</p>
      <div className="row alerts-optin-actions">
        <button className="btn" type="button" onClick={handleEnable} disabled={busy}>
          {busy ? 'Enabling...' : 'Enable Alerts'}
        </button>
        <button className="btn btn-ghost" type="button" onClick={handleDismiss} disabled={busy}>
          Not now
        </button>
      </div>
      {message ? <p className="muted alerts-optin-message">{message}</p> : null}
    </article>
  );
}

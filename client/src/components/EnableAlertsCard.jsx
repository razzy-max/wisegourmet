import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../api/userApi';
import { ensurePushSubscription, isIosNonStandalone, isPushSupported, PUSH_SUBSCRIBED_EVENT } from '../lib/pushSubscribe';

const DISMISS_KEY = 'wg:alerts-card:dismissed:';

const ROLE_COPY = {
  customer: {
    title: 'Enable Alerts',
    description: 'Get notified about your order status, plus deals and updates from Wise Gourmet.',
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

  const copy = useMemo(() => ROLE_COPY[user?.role] || null, [user?.role]);

  const loadStatus = useCallback(async () => {
    if (!isAuthenticated || !user?.role || user.role === 'admin') {
      setLoading(false);
      return;
    }

    const alreadyDismissed = window.localStorage.getItem(`${DISMISS_KEY}${user.role}`) === '1';
    setDismissed(alreadyDismissed);

    if (!isPushSupported()) {
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

  useEffect(() => {
    // The app-wide auto-enable hook may subscribe this device in the
    // background off the user's first click — stay in sync so this card
    // hides itself the moment that happens, without needing a manual retry.
    window.addEventListener(PUSH_SUBSCRIBED_EVENT, loadStatus);
    return () => window.removeEventListener(PUSH_SUBSCRIBED_EVENT, loadStatus);
  }, [loadStatus]);

  const handleEnable = async () => {
    setBusy(true);
    setMessage('');

    try {
      await ensurePushSubscription(publicKey);
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

  if (isIosNonStandalone()) {
    return (
      <article className="panel alerts-optin-card" role="region" aria-label="Enable notifications">
        <h3>{copy.title}</h3>
        <p className="muted">
          On iPhone, notifications only work once this app is added to your Home Screen.
        </p>
        <div className="row alerts-optin-actions">
          <Link to="/install" className="btn">
            Install App
          </Link>
          <button className="btn btn-ghost" type="button" onClick={handleDismiss}>
            Not now
          </button>
        </div>
      </article>
    );
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

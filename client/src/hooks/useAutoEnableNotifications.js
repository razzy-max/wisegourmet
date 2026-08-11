import { useEffect } from 'react';
import { userApi } from '../api/userApi';
import { ensurePushSubscription, isIosNonStandalone, isPushSupported } from '../lib/pushSubscribe';

// Browsers require a real user gesture before a permission prompt can appear
// (and will auto-block a site that prompts without one), so this can't fire
// the instant the user logs in. Instead it piggybacks on their very first
// click anywhere post-login — no dedicated "Enable" button needed for the
// common case where permission hasn't been decided yet.
export function useAutoEnableNotifications(isAuthenticated, role) {
  useEffect(() => {
    if (!isAuthenticated || !role || role === 'admin') return undefined;
    if (!isPushSupported()) return undefined;
    if (window.Notification.permission !== 'default') return undefined;
    // Guaranteed to fail from a plain iOS browser tab — don't spend the
    // user's first click on it. EnableAlertsCard/Profile show the "install
    // first" guidance instead.
    if (isIosNonStandalone()) return undefined;

    let cancelled = false;

    const handleFirstInteraction = async () => {
      try {
        const config = await userApi.notificationConfig();
        if (cancelled || !config.enabled || !config.publicKey) return;
        await ensurePushSubscription(config.publicKey);
      } catch {
        // Best-effort background convenience — EnableAlertsCard/Profile remain as manual fallbacks.
      }
    };

    document.addEventListener('click', handleFirstInteraction, { once: true });

    return () => {
      cancelled = true;
      document.removeEventListener('click', handleFirstInteraction);
    };
  }, [isAuthenticated, role]);
}

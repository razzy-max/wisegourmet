import { useEffect } from 'react';
import { userApi } from '../api/userApi';
import { ensurePushSubscription, isIosNonStandalone, isPushSupported } from '../lib/pushSubscribe';
import { GESTURE_EVENTS } from '../lib/interactionEvents';

// Browsers require a real user gesture before a permission prompt can appear
// (and will auto-block a site that prompts without one), so this can't fire
// the instant the user logs in. Instead it piggybacks on their very first
// interaction anywhere post-login — no dedicated "Enable" button needed for
// the common case where permission hasn't been decided yet.
export function useAutoEnableNotifications(isAuthenticated, role) {
  useEffect(() => {
    if (!isAuthenticated || !role || role === 'admin') return undefined;
    if (!isPushSupported()) return undefined;
    // Guaranteed to fail from a plain iOS browser tab — don't spend the
    // user's first interaction on it. EnableAlertsCard/Profile show the
    // "install first" guidance instead.
    if (isIosNonStandalone()) return undefined;

    let cancelled = false;

    function attachListeners() {
      GESTURE_EVENTS.forEach((type) => document.addEventListener(type, handleInteraction, { once: true }));
    }

    function removeListeners() {
      GESTURE_EVENTS.forEach((type) => document.removeEventListener(type, handleInteraction));
    }

    async function handleInteraction() {
      // One gesture may satisfy several of the listened-for event types
      // (e.g. a tap fires both touchstart and click) — drop the rest so it
      // only runs once per interaction.
      removeListeners();
      if (cancelled || window.Notification.permission !== 'default') return;

      try {
        const config = await userApi.notificationConfig();
        if (cancelled || !config.enabled || !config.publicKey) return;
        await ensurePushSubscription(config.publicKey);
      } catch {
        // Best-effort background convenience — EnableAlertsCard/Profile remain as manual fallbacks.
      } finally {
        // Permission is still undecided (the browser prompt was dismissed
        // without a choice, the config fetch failed, etc.) — listen for the
        // next interaction instead of giving up for the rest of the session.
        if (!cancelled && window.Notification.permission === 'default') {
          attachListeners();
        }
      }
    }

    if (window.Notification.permission === 'default') {
      attachListeners();
    }

    return () => {
      cancelled = true;
      removeListeners();
    };
  }, [isAuthenticated, role]);
}

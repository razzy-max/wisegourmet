import { useCallback, useEffect, useRef, useState } from 'react';
import { orderApi } from '../api/orderApi';

const MIN_INTERVAL_MS = 5000;

export function useLocationBroadcaster(orderId) {
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const [checkingPermission, setCheckingPermission] = useState(true);
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const watchIdRef = useRef(null);
  const lastSentRef = useRef(0);
  const consecutiveErrorsRef = useRef(0);

  const stop = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setSharing(false);
  }, []);

  const start = useCallback(() => {
    if (!orderId) return;
    if (!('geolocation' in navigator)) {
      setError('Location sharing is not supported on this device.');
      return;
    }

    setError('');

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        // A successful reading clears any earlier transient error — the
        // watch has self-recovered, no need for the user to do anything.
        consecutiveErrorsRef.current = 0;
        setError('');

        const now = Date.now();
        if (now - lastSentRef.current < MIN_INTERVAL_MS) return;
        lastSentRef.current = now;

        const { latitude, longitude } = position.coords;
        orderApi.updateLocation(orderId, { lat: latitude, lng: longitude }).catch(() => {});
      },
      (geoError) => {
        if (geoError.code === geoError.PERMISSION_DENIED) {
          setError('Location permission was denied.');
          stop();
          return;
        }

        // A single timed-out or temporarily-unavailable fix (common on the
        // first cold GPS attempt, especially indoors) isn't fatal — keep the
        // existing watch running so it can self-recover on its own, rather
        // than tearing it down and forcing a page refresh to try again.
        consecutiveErrorsRef.current += 1;
        setError(
          consecutiveErrorsRef.current >= 3
            ? "Still having trouble getting an accurate location. Make sure Location is turned on for this browser in your device settings, and try moving somewhere with a clearer view of the sky."
            : 'Still trying to get an accurate location…'
        );
      },
      { enableHighAccuracy: true, maximumAge: 4000, timeout: 15000 }
    );

    setSharing(true);
  }, [orderId, stop]);

  useEffect(() => {
    if (!orderId) {
      setCheckingPermission(false);
      return undefined;
    }

    let cancelled = false;
    let removeClickListener;

    const askOnFirstInteraction = () => {
      const handleFirstInteraction = () => start();
      document.addEventListener('click', handleFirstInteraction, { once: true });
      removeClickListener = () => document.removeEventListener('click', handleFirstInteraction);
    };

    if (!('permissions' in navigator)) {
      // Permissions API can't be queried here (e.g. older Safari) — we can't
      // tell in advance whether this is already granted or denied, so fall
      // back to asking on the page's first click, same as the common case.
      askOnFirstInteraction();
      setCheckingPermission(false);
      return () => {
        cancelled = true;
        if (removeClickListener) removeClickListener();
      };
    }

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        if (cancelled) return;

        if (status.state === 'granted') {
          // Browsers remember a granted permission across reloads, same as
          // notifications — resume sharing automatically, no click needed.
          start();
        } else if (status.state === 'denied') {
          setPermissionBlocked(true);
        } else {
          // Not yet decided — ask the moment the user makes any natural
          // interaction on this page, instead of requiring a dedicated
          // "Share my location" button (browsers require a real gesture
          // before showing the prompt at all).
          askOnFirstInteraction();
        }

        setCheckingPermission(false);
      })
      .catch(() => {
        if (cancelled) return;
        askOnFirstInteraction();
        setCheckingPermission(false);
      });

    return () => {
      cancelled = true;
      if (removeClickListener) removeClickListener();
    };
  }, [orderId, start]);

  useEffect(() => stop, [stop]);

  return { sharing, error, checkingPermission, permissionBlocked, start, stop };
}

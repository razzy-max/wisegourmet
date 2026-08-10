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
        const now = Date.now();
        if (now - lastSentRef.current < MIN_INTERVAL_MS) return;
        lastSentRef.current = now;

        const { latitude, longitude } = position.coords;
        orderApi.updateLocation(orderId, { lat: latitude, lng: longitude }).catch(() => {});
      },
      (geoError) => {
        setError(
          geoError.code === geoError.PERMISSION_DENIED
            ? 'Location permission was denied.'
            : 'Unable to get your location right now.'
        );
        stop();
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

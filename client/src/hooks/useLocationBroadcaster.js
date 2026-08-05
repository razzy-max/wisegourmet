import { useCallback, useEffect, useRef, useState } from 'react';
import { orderApi } from '../api/orderApi';

const MIN_INTERVAL_MS = 5000;

export function useLocationBroadcaster(orderId) {
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState('');
  const [checkingPermission, setCheckingPermission] = useState(true);
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
    if (!orderId || !('permissions' in navigator)) {
      setCheckingPermission(false);
      return undefined;
    }

    let cancelled = false;

    navigator.permissions
      .query({ name: 'geolocation' })
      .then((status) => {
        if (cancelled) return;
        // Browsers remember a granted geolocation permission across reloads,
        // same as notifications — resume sharing automatically instead of
        // making the user click "Share my location" again every visit.
        if (status.state === 'granted') {
          start();
        }
        setCheckingPermission(false);
      })
      .catch(() => {
        // Permissions API doesn't support querying 'geolocation' in this
        // browser (e.g. older Safari) — fall back to the manual button.
        if (!cancelled) setCheckingPermission(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orderId, start]);

  useEffect(() => stop, [stop]);

  return { sharing, error, checkingPermission, start, stop };
}

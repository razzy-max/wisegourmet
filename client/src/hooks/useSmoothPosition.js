import { useEffect, useRef, useState } from 'react';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Leaflet's <Marker> just snaps to whatever position prop it's given —
// there's no built-in tweening. This interpolates toward each new [lat,
// lng] over `durationMs` so a live rider/customer location update glides
// along the map instead of jumping, without touching Leaflet internals
// (react-leaflet re-renders <Marker> with each intermediate position,
// which calls setLatLng under the hood same as any other prop change).
export function useSmoothPosition(target, durationMs = 1200) {
  const [display, setDisplay] = useState(target);
  const fromRef = useRef(target);
  const frameRef = useRef(null);
  const targetLat = target?.[0];
  const targetLng = target?.[1];

  useEffect(() => {
    if (targetLat === undefined || targetLng === undefined) {
      fromRef.current = null;
      setDisplay(null);
      return undefined;
    }

    const nextTarget = [targetLat, targetLng];
    const from = fromRef.current;

    if (!from || prefersReducedMotion()) {
      fromRef.current = nextTarget;
      setDisplay(nextTarget);
      return undefined;
    }

    // A jump larger than ~1km (roughly) is much more likely a GPS snap /
    // reconnect than real movement between two updates a few seconds
    // apart — teleport instead of animating a long, fake-looking "flight".
    const roughDistanceDeg = Math.hypot(nextTarget[0] - from[0], nextTarget[1] - from[1]);
    if (roughDistanceDeg > 0.01) {
      fromRef.current = nextTarget;
      setDisplay(nextTarget);
      return undefined;
    }

    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const eased = 1 - (1 - progress) * (1 - progress); // ease-out
      setDisplay([
        from[0] + (nextTarget[0] - from[0]) * eased,
        from[1] + (nextTarget[1] - from[1]) * eased,
      ]);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = nextTarget;
      }
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [targetLat, targetLng, durationMs]);

  return display;
}

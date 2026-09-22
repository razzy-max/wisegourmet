// Any of these count as a "real user gesture" for triggering a browser
// permission prompt (Notification/geolocation) — not just a tap/click.
// touchstart catches a tap before it resolves to a click, pointerdown covers
// mouse/pen/touch generically, keydown covers keyboard-only navigation.
export const GESTURE_EVENTS = ['click', 'touchstart', 'pointerdown', 'keydown'];

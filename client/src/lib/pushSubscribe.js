import { userApi } from '../api/userApi';

export const PUSH_SUBSCRIBED_EVENT = 'wg:push-subscribed';

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

export function isPushSupported() {
  return (
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

// navigator.serviceWorker.ready never resolves if no service worker is ever
// going to register (e.g. local dev, where registration is intentionally
// production-only) — awaiting it directly would hang forever. Race it
// against a short timeout instead, resolving to null rather than hanging.
export async function getServiceWorkerRegistration(timeoutMs = 3000) {
  if (!('serviceWorker' in navigator)) {
    return null;
  }

  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
  } catch {
    return null;
  }
}

// Every iOS browser (Safari, Chrome, Firefox, Edge) is required by Apple to
// run on WebKit, and Web Push only actually works from a page added to the
// Home Screen (standalone display mode) — a plain browser tab will report
// these APIs as present (isPushSupported() === true) but any subscribe
// attempt will fail. This is an iOS/WebKit-wide restriction, not specific
// to Safari's UI, and there's no way to lift it from code.
const isIos = () => {
  const ua = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(ua) && !window.MSStream;
};

export function isIosNonStandalone() {
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  return isIos() && !isStandalone;
}

export async function ensurePushSubscription(publicKey) {
  if (isIosNonStandalone()) {
    throw new Error(
      'Notifications on iPhone require adding this app to your Home Screen first. Tap "Install App" in the menu, open it from your Home Screen, then try again.'
    );
  }

  if (!publicKey) {
    throw new Error('Notifications are not configured yet.');
  }

  if (window.Notification.permission === 'denied') {
    // A standalone iOS home-screen app has no visible browser chrome, so
    // "open your browser's site settings" (the desktop/Android fix) points
    // nowhere — the actual reset path is the iPhone Settings app, or
    // removing and re-adding the Home Screen icon if it's not listed there.
    if (isIos()) {
      throw new Error(
        'Notifications are blocked for this app. Open iPhone Settings, scroll to this app in the list, and turn Notifications on. If it isn’t listed there, remove it from your Home Screen and add it again, then retry.'
      );
    }
    throw new Error(
      "Notifications are blocked for this site in your browser. Open your browser's site settings, allow notifications, then try again."
    );
  }

  const permission = await window.Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.');
  }

  const registration = await getServiceWorkerRegistration();
  if (!registration) {
    throw new Error('Notifications are not available in this environment right now.');
  }

  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  await userApi.subscribeNotifications(subscription.toJSON());
  window.dispatchEvent(new Event(PUSH_SUBSCRIBED_EVENT));

  return subscription;
}

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

// Every iOS browser (Safari, Chrome, Firefox, Edge) is required by Apple to
// run on WebKit, and Web Push only actually works from a page added to the
// Home Screen (standalone display mode) — a plain browser tab will report
// these APIs as present (isPushSupported() === true) but any subscribe
// attempt will fail. This is an iOS/WebKit-wide restriction, not specific
// to Safari's UI, and there's no way to lift it from code.
export function isIosNonStandalone() {
  const ua = navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(ua) && !window.MSStream;
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  return isIos && !isStandalone;
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
    throw new Error(
      "Notifications are blocked for this site in your browser. Open your browser's site settings, allow notifications, then try again."
    );
  }

  const permission = await window.Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission was not granted.');
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
  window.dispatchEvent(new Event(PUSH_SUBSCRIBED_EVENT));

  return subscription;
}

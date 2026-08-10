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

export async function ensurePushSubscription(publicKey) {
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

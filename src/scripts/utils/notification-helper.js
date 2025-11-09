import { convertBase64ToUint8Array } from './index';
import { VAPID_PUBLIC_KEY } from '../config';
import { subscribePushNotification, unsubscribePushNotification } from '../data/api';

export function isNotificationAvailable() {
  return 'Notification' in window;
}

export function isNotificationGranted() {
  return Notification.permission === 'granted';
}

export async function requestNotificationPermission() {
  if (!isNotificationAvailable()) {
    console.error('Notification API unsupported.');
    return false;
  }

  if (isNotificationGranted()) {
    return true;
  }

  const status = await Notification.requestPermission();

  if (status === 'denied') {
    alert('Notification permission was denied.');
    return false;
  }

  if (status === 'default') {
    alert('Notification permission was closed or ignored.');
    return false;
  }

  return true;
}

export async function getPushSubscription() {
  const registration = await navigator.serviceWorker.ready;
  return await registration.pushManager.getSubscription();
}

export async function isCurrentPushSubscriptionAvailable() {
  return !!(await getPushSubscription());
}

export function generateSubscribeOptions() {
  return {
    userVisibleOnly: true,
    applicationServerKey: convertBase64ToUint8Array(VAPID_PUBLIC_KEY),
  };
}

export async function subscribe() {
  if (!(await requestNotificationPermission())) {
    return;
  }

  if (await isCurrentPushSubscriptionAvailable()) {
    alert('Already subscribed to push notifications.');
    return;
  }

  console.log('Starting push notification subscription...');

  const failureSubscribeMessage = 'Failed to enable push notification subscription.';
  const successSubscribeMessage = 'Successfully enabled push notification subscription.';

  let pushSubscription;

  try {
    const registration = await navigator.serviceWorker.ready;
    pushSubscription = await registration.pushManager.subscribe(generateSubscribeOptions());

    const { endpoint, keys } = pushSubscription.toJSON();
    const response = await subscribePushNotification({ endpoint, keys });

    if (!response.ok) {
      console.error('subscribe: response:', response);
      alert(failureSubscribeMessage);

      // Undo subscribe to push notification
      await pushSubscription.unsubscribe();

      return;
    }

    alert(successSubscribeMessage);
  } catch (error) {
    console.error('subscribe: error:', error);
    alert(failureSubscribeMessage);

    // Undo subscribe to push notification
    if (pushSubscription) {
      await pushSubscription.unsubscribe();
    }
  }
}

export async function unsubscribe() {
  const failureUnsubscribeMessage = 'Failed to disable push notification subscription.';
  const successUnsubscribeMessage = 'Successfully disabled push notification subscription.';

  try {
    const pushSubscription = await getPushSubscription();

    if (!pushSubscription) {
      alert('Cannot unsubscribe from push notifications because you are not currently subscribed.');
      return;
    }

    const { endpoint, keys } = pushSubscription.toJSON();
    const response = await unsubscribePushNotification({ endpoint });

    if (!response.ok) {
      alert(failureUnsubscribeMessage);
      console.error('unsubscribe: response:', response);

      return;
    }

    const unsubscribed = await pushSubscription.unsubscribe();

    if (!unsubscribed) {
      alert(failureUnsubscribeMessage);
      await subscribePushNotification({ endpoint, keys });

      return;
    }

    alert(successUnsubscribeMessage);
  } catch (error) {
    alert(failureUnsubscribeMessage);
    console.error('unsubscribe: error:', error);
  }
}

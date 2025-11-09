import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { BASE_URL } from './config';

// Do precaching
const manifest = self.__WB_MANIFEST;
precacheAndRoute(manifest);

// Runtime caching for Google Fonts
registerRoute(
  ({ url }) => {
    return (
      url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com'
    );
  },
  new CacheFirst({
    cacheName: 'google-fonts',
  }),
);

// Runtime caching for Font Awesome
registerRoute(
  ({ url }) => {
    return url.origin === 'https://cdnjs.cloudflare.com' || url.origin.includes('fontawesome');
  },
  new CacheFirst({
    cacheName: 'fontawesome',
  }),
);

// Runtime caching for UI Avatars API
registerRoute(
  ({ url }) => {
    return url.origin === 'https://ui-avatars.com';
  },
  new CacheFirst({
    cacheName: 'avatars-api',
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  }),
);

// Runtime caching for API calls (NetworkFirst for fresh data with fallback)
registerRoute(
  ({ request, url }) => {
    const baseUrl = new URL(BASE_URL);
    return baseUrl.origin === url.origin && request.destination !== 'image';
  },
  new NetworkFirst({
    cacheName: 'graminsta-api',
  }),
);

// Runtime caching for API images (StaleWhileRevalidate for better performance)
registerRoute(
  ({ request, url }) => {
    const baseUrl = new URL(BASE_URL);
    return baseUrl.origin === url.origin && request.destination === 'image';
  },
  new StaleWhileRevalidate({
    cacheName: 'graminsta-api-images',
  }),
);

// Runtime caching for Maptiler (map tiles)
registerRoute(
  ({ url }) => {
    return url.origin.includes('maptiler');
  },
  new CacheFirst({
    cacheName: 'maptiler-api',
  }),
);

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received:', event);

  async function showNotification() {
    try {
      // Check if there's any data
      if (!event.data) {
        console.log('[Service Worker] Push event has no data (might be a test ping)');
        await self.registration.showNotification('Graminsta Test', {
          body: 'Push notification test received!',
          icon: '/images/logo.png',
          badge: '/favicon.png',
        });
        return;
      }

      // Try to get the data as text first
      const dataText = event.data.text();
      console.log('[Service Worker] Push data (text):', dataText);

      let data;
      try {
        // Try to parse as JSON
        data = JSON.parse(dataText);
        console.log('[Service Worker] Push data (parsed):', data);
      } catch (parseError) {
        // If not JSON, treat as plain text
        console.log('[Service Worker] Push data is not JSON, using as plain text');
        await self.registration.showNotification('Graminsta Notification', {
          body: dataText || 'You have a new notification!',
          icon: '/images/logo.png',
          badge: '/favicon.png',
        });
        return;
      }

      // Handle JSON data
      const title = data.title || 'Graminsta Notification';
      const options = {
        body: data.options?.body || data.body || 'New story available!',
        icon: data.options?.icon || data.icon || '/images/logo.png',
        badge: data.options?.badge || data.badge || '/favicon.png',
        data: {
          url: data.options?.data?.url || data.url || '/',
          storyId: data.options?.data?.storyId || data.storyId,
        },
        actions: data.options?.actions || data.actions || [
          {
            action: 'view',
            title: 'View Story',
          },
          {
            action: 'close',
            title: 'Close',
          },
        ],
      };

      await self.registration.showNotification(title, options);
    } catch (error) {
      console.error('[Service Worker] Error showing notification:', error);
      
      // Fallback notification if everything fails
      await self.registration.showNotification('Graminsta Notification', {
        body: 'You have a new notification!',
        icon: '/images/logo.png',
        badge: '/favicon.png',
      });
    }
  }

  event.waitUntil(showNotification());
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);

  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  // Handle notification click - navigate to the story detail page
  const urlToOpen = event.notification.data?.url || '/';
  const storyId = event.notification.data?.storyId;

  const promiseChain = clients
    .matchAll({
      type: 'window',
      includeUncontrolled: true,
    })
    .then((windowClients) => {
      // Check if there's already a window open
      let matchingClient = null;

      for (let i = 0; i < windowClients.length; i++) {
        const windowClient = windowClients[i];
        if (windowClient.url === urlToOpen || windowClient.url.includes('graminsta')) {
          matchingClient = windowClient;
          break;
        }
      }

      // If a matching window is found, focus it and navigate
      if (matchingClient) {
        if (storyId) {
          matchingClient.navigate(`/#/stories/${storyId}`);
        } else {
          matchingClient.navigate(urlToOpen);
        }
        return matchingClient.focus();
      } else {
        // Otherwise, open a new window
        const urlToNavigate = storyId ? `/#/stories/${storyId}` : urlToOpen;
        return clients.openWindow(urlToNavigate);
      }
    });

  event.waitUntil(promiseChain);
});

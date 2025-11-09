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

// Background Sync - Sync pending stories when online
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync event:', event.tag);

  if (event.tag === 'sync-stories') {
    event.waitUntil(syncPendingStories());
  }
});

async function syncPendingStories() {
  console.log('[Service Worker] Starting to sync pending stories...');

  try {
    // Open IndexedDB directly
    const dbRequest = indexedDB.open('graminsta', 2);
    
    const db = await new Promise((resolve, reject) => {
      dbRequest.onsuccess = () => resolve(dbRequest.result);
      dbRequest.onerror = () => reject(dbRequest.error);
    });

    const transaction = db.transaction(['pending-stories'], 'readonly');
    const store = transaction.objectStore('pending-stories');
    const index = store.index('status');
    const request = index.getAll('pending');

    const pendingStories = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    console.log(`[Service Worker] Found ${pendingStories.length} pending stories to sync`);

    if (pendingStories.length === 0) {
      db.close();
      return;
    }

    // Get auth token from stored data
    const accessToken = await getStoredAccessToken();
    if (!accessToken) {
      console.error('[Service Worker] No access token found, cannot sync');
      db.close();
      return;
    }

    const syncResults = [];

    for (const pendingStory of pendingStories) {
      try {
        // Create FormData for API submission
        const formData = new FormData();
        formData.append('description', pendingStory.description);
        
        // Convert base64 photo back to blob if needed
        if (pendingStory.photoData) {
          const blob = await fetch(pendingStory.photoData).then(r => r.blob());
          formData.append('photo', blob, 'photo.jpg');
        }
        
        if (pendingStory.lat) formData.append('lat', pendingStory.lat);
        if (pendingStory.lon) formData.append('lon', pendingStory.lon);

        // Send to API
        const response = await fetch('https://story-api.dicoding.dev/v1/stories', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
          body: formData,
        });

        if (response.ok) {
          // Mark as synced
          const updateTransaction = db.transaction(['pending-stories'], 'readwrite');
          const updateStore = updateTransaction.objectStore('pending-stories');
          const getRequest = updateStore.get(pendingStory._tempId);

          await new Promise((resolve, reject) => {
            getRequest.onsuccess = () => {
              const story = getRequest.result;
              if (story) {
                story.status = 'synced';
                story.syncedAt = new Date().toISOString();
                const putRequest = updateStore.put(story);
                putRequest.onsuccess = () => resolve();
                putRequest.onerror = () => reject(putRequest.error);
              } else {
                resolve();
              }
            };
            getRequest.onerror = () => reject(getRequest.error);
          });

          syncResults.push({ success: true, tempId: pendingStory._tempId });
          console.log(`[Service Worker] Successfully synced story ${pendingStory._tempId}`);
        } else {
          syncResults.push({ success: false, tempId: pendingStory._tempId });
          console.error(`[Service Worker] Failed to sync story ${pendingStory._tempId}`);
        }
      } catch (error) {
        console.error('[Service Worker] Error syncing story:', error);
        syncResults.push({ success: false, tempId: pendingStory._tempId, error: error.message });
      }
    }

    db.close();

    // Show notification about sync results
    const successCount = syncResults.filter(r => r.success).length;
    if (successCount > 0) {
      await self.registration.showNotification('Graminsta - Sync Complete', {
        body: `Successfully synced ${successCount} story(ies) from offline queue.`,
        icon: '/images/logo.png',
        badge: '/favicon.png',
        tag: 'sync-complete',
      });
    }

    console.log('[Service Worker] Sync completed:', syncResults);
  } catch (error) {
    console.error('[Service Worker] Sync failed:', error);
    throw error; // Re-throw to retry sync later
  }
}

async function getStoredAccessToken() {
  try {
    // Try to get from IndexedDB or localStorage through clients
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      // Send message to client to get token
      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (event) => {
          resolve(event.data.token);
        };
        clients[0].postMessage({ type: 'GET_TOKEN' }, [messageChannel.port2]);
      });
    }
    return null;
  } catch (error) {
    console.error('[Service Worker] Error getting token:', error);
    return null;
  }
}

// Ademruimte Service Worker
const CACHE_NAME = 'ademruimte-v3';
const STATIC_CACHE = 'ademruimte-static-v3';
const DYNAMIC_CACHE = 'ademruimte-dynamic-v3';

// Files to cache immediately (app shell only)
const STATIC_ASSETS = [
  '/offline',
];

// Install event - cache minimal static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up ALL old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map((key) => {
            console.log('[SW] Removing old cache:', key);
            return caches.delete(key);
          })
      );
    })
  );
  return self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip Firebase and external API calls
  if (
    url.origin.includes('firebaseio.com') ||
    url.origin.includes('googleapis.com') ||
    url.origin.includes('google.com') ||
    url.pathname.includes('/api/')
  ) {
    return;
  }

  // NEVER cache Next.js JS/CSS chunks — they change hash on every deploy
  if (
    url.pathname.startsWith('/_next/static/chunks/') ||
    url.pathname.startsWith('/_next/static/css/') ||
    url.pathname.startsWith('/_next/static/media/') ||
    url.pathname.includes('/_next/')
  ) {
    // Always fetch fresh from network, no caching
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Return cached response if available
      if (cachedResponse) {
        return cachedResponse;
      }

      // Otherwise fetch from network
      return fetch(request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response || response.status !== 200 || response.type === 'error') {
            return response;
          }

          // Only cache static public assets (icons, manifest, etc.) not pages
          if (
            url.pathname.startsWith('/icons/') ||
            url.pathname === '/manifest.json' ||
            url.pathname === '/new_icon.png' ||
            url.pathname === '/icon-192.png' ||
            url.pathname === '/icon-512.png'
          ) {
            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE).then((cache) => {
              cache.put(request, responseToCache);
            });
          }

          return response;
        })
        .catch(() => {
          // If offline and not in cache, show offline page
          if (request.destination === 'document') {
            return caches.match('/offline');
          }
        });
    })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData());
  }
});

async function syncData() {
  // Placeholder for syncing offline data
  console.log('[SW] Syncing offline data...');
}

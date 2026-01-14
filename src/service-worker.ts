import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

declare const self: ServiceWorkerGlobalScope;

clientsClaim();
precacheAndRoute(self.__WB_MANIFEST);

// Cache proposal data
registerRoute(
  ({ url }) => url.pathname.startsWith('/proposal/'),
  new NetworkFirst({
    cacheName: 'proposals',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 24 * 60 * 60 // 24 hours
      })
    ]
  })
);

// Cache static assets, but EXCLUDE Vite's optimized deps to prevent 504 errors
registerRoute(
  ({ request, url }) => {
    // Don't cache Vite's optimized dependencies - they cause 504 errors when outdated
    if (url.pathname.includes('/node_modules/.vite/deps/')) {
      return false;
    }
    return request.destination === 'style' || request.destination === 'script';
  },
  new CacheFirst({
    cacheName: 'static-resources'
  })
);

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
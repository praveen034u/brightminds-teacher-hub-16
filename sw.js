// sw.js - Service Worker for BrightMinds Teacher Hub

const CACHE_NAME = 'brightminds-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/brightminds-logo1.png',
  '/src/main.tsx',
  // Add more assets as needed
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      );
    })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request);
      })
  );
});

// PWA: Listen for app updates
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});

// Optional: Add logic for offline fallback, push notifications, etc.

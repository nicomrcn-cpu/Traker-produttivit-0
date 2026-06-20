const CACHE_NAME = 'habits-tracker-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css',
  '/src/firebase.ts',
  '/src/types.ts',
  '/metadata.json'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Let Vite handle development assets directly and falling back to network
  e.respondWith(
    fetch(e.request).catch(async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(e.request);
      return cachedResponse || new Response('Offline', { status: 503 });
    })
  );
});

// Listener per la simulazione di push reali
self.addEventListener('push', (e) => {
  let data = { 
    title: 'Mantra del Giorno', 
    body: 'Continua così! Ogni piccolo passo ti avvicina ai tuoi obiettivi. 🌟' 
  };
  
  if (e.data) {
    try {
      data = e.data.json();
    } catch (err) {
      data = { title: 'Tracker Abitudini', body: e.data.text() };
    }
  }

  const options = {
    body: data.body,
    icon: '/assets/icon.png',
    badge: '/assets/icon.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    }
  };

  e.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

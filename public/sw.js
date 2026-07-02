const CACHE_NAME = 'blocnotif-v2';
const ASSETS = [
  '/',
  '/index.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

self.addEventListener('push', (event) => {
  console.log('Push message received', event);
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: data.icon || '/icons/icon-192.png',
      data: data.data,
    };
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );

    // Notify client to log "delivered" event
    if (data.data?.notifId) {
      notifyClients({ type: 'LOG_NOTIF_EVENT', notifId: data.data.notifId, event: 'delivered' });
    }
  }
});

self.addEventListener('notificationclick', (event) => {
  const notifId = event.notification.data?.notifId;
  event.notification.close();

  // Notify client to log "clicked" event
  if (notifId) {
    notifyClients({ type: 'LOG_NOTIF_EVENT', notifId, event: 'clicked' });
  }

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

function notifyClients(message) {
  self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    for (const client of clients) {
      client.postMessage(message);
    }
  });
}

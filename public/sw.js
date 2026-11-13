// Service worker: primero red (para que los cambios se vean al reabrir), con copia local sin conexión.
var CACHE = 'gym-v8';

self.addEventListener('install', function () { self.skipWaiting(); });

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (ks) {
        return Promise.all(ks.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin || new URL(r.url).pathname.indexOf('/api/') === 0) return;
  e.respondWith(
    fetch(new Request(r, { cache: 'no-store' }))
      .then(function (res) {
        if (res && res.ok) {
          var cp = res.clone();
          caches.open(CACHE).then(function (c) { c.put(r, cp); });
        }
        return res;
      })
      .catch(function () {
        return caches.match(r).then(function (m) { return m || caches.match('/index.html'); });
      })
  );
});

// Aviso de fin de descanso (push sin contenido: el texto es fijo)
self.addEventListener('push', function (e) {
  e.waitUntil(self.registration.showNotification('DESCANSO TERMINADO', {
    body: 'A por la siguiente serie 💪',
    icon: '/icon-192.png',
    tag: 'descanso',
    renotify: true
  }));
});
self.addEventListener('notificationclick', function (e) {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (cs) {
    if (cs.length) return cs[0].focus();
    return self.clients.openWindow('/');
  }));
});

/* Acceso Fútbol — push service worker (avisos de gol y saque). */

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_e) {
    data = { title: 'Acceso Fútbol', body: event.data ? event.data.text() : '' };
  }
  const title = data.title || 'Acceso Fútbol';
  const options = {
    body: data.body || '',
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    icon: data.icon || '/logo.png',
    badge: '/logo.png',
    lang: 'es-MX',
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) {
            try {
              client.navigate(target);
            } catch (_e) {
              /* cross-origin / not allowed */
            }
          }
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});

/* Chrome can rotate the subscription; re-subscribe with the same key and re-register. */
self.addEventListener('pushsubscriptionchange', (event) => {
  const appServerKey =
    event.oldSubscription &&
    event.oldSubscription.options &&
    event.oldSubscription.options.applicationServerKey;
  event.waitUntil(
    (async () => {
      if (!appServerKey) return;
      try {
        const sub = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey,
        });
        await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: sub.toJSON() }),
        });
      } catch (_e) {
        /* best effort */
      }
    })()
  );
});

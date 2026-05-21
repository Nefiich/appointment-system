self.addEventListener('push', (event) => {
  let payload = { title: 'Podsjetnik za termin', body: '', url: '/rezervacije' };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (err) {
    // payload defaults
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/ico.png',
      badge: '/ico.png',
      data: { url: payload.url },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/rezervacije';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url.includes(targetUrl) && 'focus' in w) return w.focus();
      }
      if (clients.openWindow) return clients.openWindow(targetUrl);
    }),
  );
});

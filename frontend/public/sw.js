self.addEventListener('push', (event) => {
  let dades = { title: 'AITASA', body: 'Tens una notificació nova' };
  try {
    dades = event.data.json();
  } catch {
    // si el payload no és JSON, es fa servir el missatge per defecte
  }
  event.waitUntil(
    self.registration.showNotification(dades.title, {
      body: dades.body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/'));
});

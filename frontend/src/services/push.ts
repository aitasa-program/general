import { api } from './api';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function estatNotificacions(): Promise<NotificationPermission | 'no-suportat'> {
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return 'no-suportat';
  return Notification.permission;
}

// Activa les notificacions: demana permís, registra el service worker,
// crea la subscripció push i l'envia al backend perquè guardi les claus.
export async function activarNotificacions(): Promise<boolean> {
  if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }
  const permis = await Notification.requestPermission();
  if (permis !== 'granted') return false;

  const registration = await navigator.serviceWorker.ready;
  const { data } = await api.get('/push/clau-publica');
  if (!data.clauPublica) return false;

  const subscripcio = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(data.clauPublica),
  });

  const json = subscripcio.toJSON();
  await api.post('/push/subscriure', {
    endpoint: json.endpoint,
    keys: json.keys,
  });

  return true;
}

export async function enviarNotificacioProva() {
  await api.post('/push/prova');
}

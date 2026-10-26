import axios from 'axios';

const CACHE_KEY = 'aitasa-api-cache-v1';
const QUEUE_KEY = 'aitasa-offline-queue-v1';
const MAX_CACHE_BYTES = 300_000;
type PendingWrite = { id: string; method: 'patch'; url: string; data: unknown; userId: string };

function usuariIdActual(): string {
  try { return JSON.parse(localStorage.getItem('usuari') || 'null')?.id || ''; } catch { return ''; }
}

function llegirCache(): Record<string, { data: unknown; userId: string; savedAt: number }> {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch { return {}; }
}

function escriureCache(key: string, data: unknown) {
  // Evita guardar PDFs, documents o respostes grans al límit d'emmagatzematge del navegador.
  if (/pdf|document|arxiu|foto|imatge/i.test(key)) return;
  const cache = llegirCache();
  cache[key] = { data, userId: usuariIdActual(), savedAt: Date.now() };
  const entries = Object.entries(cache).sort((a, b) => b[1].savedAt - a[1].savedAt).slice(0, 20);
  let compact = Object.fromEntries(entries);
  try {
    while (JSON.stringify(compact).length > MAX_CACHE_BYTES && entries.length > 1) {
      entries.pop(); compact = Object.fromEntries(entries);
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(compact));
  } catch { /* La memòria cau és opcional; no ha d'interrompre l'ús de l'app. */ }
}

function cuaPendent(): PendingWrite[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; }
}

export function canvisPendentsOffline() { const userId = usuariIdActual(); return cuaPendent().filter((write) => write.userId === userId).length; }

function aplicarCuaSobreCache(data: unknown, url: string, userId: string) {
  const writes = cuaPendent().filter((item) => item.userId === userId);
  const result = JSON.parse(JSON.stringify(data));
  if (url === '/tasques' && Array.isArray(result)) {
    for (const write of writes) {
      const match = write.url.match(/^\/tasques\/([^/]+)\/estat$/);
      const task = match && result.find((item: { id: string }) => item.id === match[1]);
      if (task && typeof (write.data as { estat?: unknown })?.estat === 'string') task.estat = (write.data as { estat: string }).estat;
    }
  }
  if (url === '/checklists' && Array.isArray(result)) {
    for (const write of writes) {
      const match = write.url.match(/^\/checklists\/items\/([^/]+)$/);
      if (!match) continue;
      for (const checklist of result) {
        const item = checklist.items?.find((entry: { id: string }) => entry.id === match[1]);
        if (item && typeof (write.data as { marcat?: unknown })?.marcat === 'boolean') item.marcat = (write.data as { marcat: boolean }).marcat;
      }
    }
  }
  return result;
}

function esEscripturaRepetible(config: { method?: string; url?: string }) {
  return config.method?.toLowerCase() === 'patch' && (
    /^\/tasques\/[^/]+\/estat$/.test(config.url || '') || /^\/checklists\/items\/[^/]+$/.test(config.url || '')
  );
}

function notificarCua() { window.dispatchEvent(new Event('aitasa:queue-change')); }

function clauCache(config: { url?: string; params?: unknown }) {
  return `${config.url || ''}${config.params ? `?${JSON.stringify(config.params)}` : ''}`;
}

let sincronitzant = false;
async function sincronitzarCua() {
  if (sincronitzant || !navigator.onLine) return;
  const userId = usuariIdActual();
  if (!userId) return;
  sincronitzant = true;
  try {
    let queue = cuaPendent();
    for (const write of queue) {
      if (write.userId !== userId) continue;
      try {
        await api.request({ method: write.method, url: write.url, data: write.data, headers: { 'X-Aitasa-Replay': '1' } });
        queue = cuaPendent().filter((item) => item.id !== write.id);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        notificarCua();
      } catch (error) {
        if (axios.isAxiosError(error) && error.response && error.response.status >= 400 && error.response.status < 500) {
          // Una petició rebutjada no es repetirà per sempre; s'avisa perquè l'usuari la revisi.
          queue = cuaPendent().filter((item) => item.id !== write.id);
          localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
          window.dispatchEvent(new CustomEvent('aitasa:sync-error', { detail: 'Un canvi pendent no s’ha pogut sincronitzar. Revisa les dades.' }));
          notificarCua();
        } else break;
      }
    }
  } finally { sincronitzant = false; }
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api',
});

// Afegeix el token a totes les peticions si hi és
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use((response) => {
  if (response.config.method?.toLowerCase() === 'get') escriureCache(clauCache(response.config), response.data);
  return response;
}, async (error) => {
  if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
    logout();
    window.location.href = '/login';
    return Promise.reject(error);
  }
  const config = error.config;
  const noHiHaXarxa = typeof navigator !== 'undefined' && (!navigator.onLine || !error.response);
  if (config && noHiHaXarxa && config.method?.toLowerCase() === 'get') {
    const cached = llegirCache()[clauCache(config)];
    if (cached && cached.userId === usuariIdActual()) {
      window.dispatchEvent(new CustomEvent('aitasa:offline-cache', { detail: cached.savedAt }));
      return { data: aplicarCuaSobreCache(cached.data, config.url || '', cached.userId), status: 200, statusText: 'Offline cache', headers: {}, config };
    }
  }
  const esReproduccio = config && Object.entries(config.headers || {}).some(([key, value]) => key.toLowerCase() === 'x-aitasa-replay' && value === '1');
  if (config && noHiHaXarxa && esEscripturaRepetible(config) && !esReproduccio) {
    const queue = cuaPendent();
    let data = config.data;
    if (typeof data === 'string') { try { data = JSON.parse(data); } catch { data = {}; } }
    const entry: PendingWrite = { id: `${Date.now()}-${Math.random()}`, method: 'patch', url: config.url, data: data || {}, userId: usuariIdActual() };
    queue.push(entry);
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)); } catch { return Promise.reject(error); }
    notificarCua();
    return { data: { queued: true }, status: 202, statusText: 'Queued offline', headers: {}, config };
  }
  return Promise.reject(error);
});

if (typeof window !== 'undefined') window.addEventListener('online', () => { void sincronitzarCua(); });
if (typeof window !== 'undefined') window.addEventListener('load', () => { void sincronitzarCua(); });
if (typeof window !== 'undefined') window.setInterval(() => { if (navigator.onLine) void sincronitzarCua(); }, 15_000);

export async function login(usuari: string, contrasenya: string) {
  const { data } = await api.post('/auth/login', { usuari, contrasenya });
  localStorage.setItem('token', data.token);
  localStorage.setItem('usuari', JSON.stringify(data.usuari));
  void sincronitzarCua();
  return data.usuari;
}

export function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('usuari');
}

export function getUsuariActual() {
  const raw = localStorage.getItem('usuari');
  return raw ? JSON.parse(raw) : null;
}

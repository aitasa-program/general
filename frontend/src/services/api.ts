import axios from 'axios';

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

// Si el token ha caducat o és invàlid, treu la sessió i torna al login
// en comptes de deixar l'usuari atrapat a la pàgina amb l'error en vermell.
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.startsWith('/login')) {
      logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export async function login(usuari: string, contrasenya: string) {
  const { data } = await api.post('/auth/login', { usuari, contrasenya });
  localStorage.setItem('token', data.token);
  localStorage.setItem('usuari', JSON.stringify(data.usuari));
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

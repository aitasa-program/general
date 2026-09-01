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

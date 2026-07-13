import axios from 'axios';

// Vite only reads VITE_* env vars at BUILD time. If Railway's build step
// doesn't pass this through as a build argument (rather than just a
// runtime variable), import.meta.env.VITE_API_BASE_URL ends up undefined
// in the shipped bundle and the deployed frontend silently can't reach
// the backend. This fallback is a safety net for exactly that case —
// update it if the backend's Railway URL ever changes.
const PRODUCTION_API_FALLBACK = 'https://scope-ticket-monitor-production.up.railway.app/api';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || PRODUCTION_API_FALLBACK,
  timeout: 10_000,
  withCredentials: true, // send/receive the session cookie
});

// --- Auth ---
export function requestMagicLink(email) {
  return api.post('/auth/request-link', { email }).then((res) => res.data);
}

export function fetchCurrentUser() {
  return api
    .get('/auth/me')
    .then((res) => res.data)
    .catch((err) => {
      if (err.response?.status === 401) return null;
      throw err;
    });
}

export function logout() {
  return api.post('/auth/logout').then((res) => res.data);
}

// --- Telegram ---
export function getTelegramLinkCode() {
  return api.get('/telegram/link-code').then((res) => res.data);
}

// --- Watchlist ---
export function getWatchlist() {
  return api.get('/watchlist').then((res) => res.data);
}

export function addToWatchlist(movieId) {
  return api.post('/watchlist', { movieId }).then((res) => res.data);
}

export function removeFromWatchlist(movieId) {
  return api.delete(`/watchlist/${movieId}`).then((res) => res.data);
}
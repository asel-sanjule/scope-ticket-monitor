import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10_000,
  withCredentials: true, // send/receive the session cookie
});

// Auth API calls
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

// Telegram API calls
export function getTelegramLinkCode() {
  return api.get('/telegram/link-code').then((res) => res.data);
}

// Watchlist API calls
export function getWatchlist() {
  return api.get('/watchlist').then((res) => res.data);
}

export function addToWatchlist(movieId) {
  return api.post('/watchlist', { movieId }).then((res) => res.data);
}

export function removeFromWatchlist(movieId) {
  return api.delete(`/watchlist/${movieId}`).then((res) => res.data);
}
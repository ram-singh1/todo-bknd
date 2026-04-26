import axios from 'axios';

// API base URL resolution:
//   1. EXPO_PUBLIC_API_URL  — set in app.json/eas.json or via .env at build
//      time. Use this for production builds pointing at Render.
//   2. Fallback to the LAN dev URL below — only used during local dev when
//      no env var is provided.
//
// To override locally, create a .env file at frontend/ root:
//   EXPO_PUBLIC_API_URL=http://192.168.1.42:5000/api
// and restart `expo start`. EXPO_PUBLIC_* vars are inlined at build time.
const DEFAULT_DEV_URL = 'http://172.31.41.64:5000/api';

const getBaseURL = () => {
  return process.env.EXPO_PUBLIC_API_URL || DEFAULT_DEV_URL;
};

const api = axios.create({
  baseURL: getBaseURL(),
  // 15s was long enough that a wrong/stale dev IP felt like a frozen UI.
  // 8s is plenty for a healthy LAN call and fails fast otherwise.
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Preserve the full error object so callers can inspect error.response.data.code
    // (needed for handling 402 PREMIUM_REQUIRED and other API errors.)
    if (error.response) {
      const msg = error.response.data?.message || 'Something went wrong';
      error.message = msg;
      return Promise.reject(error);
    }
    if (error.request) {
      error.message = 'Network error. Please check your connection.';
      return Promise.reject(error);
    }
    return Promise.reject(error);
  }
);

export default api;

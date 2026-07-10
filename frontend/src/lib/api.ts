import axios, {
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios';

/** Key under which the JWT is persisted in localStorage. */
export const AUTH_TOKEN_KEY = 'vectordesk.token';

/** Base URL for the API, configurable per environment. */
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

/** Read the persisted auth token (if any). */
export const getToken = (): string | null =>
  localStorage.getItem(AUTH_TOKEN_KEY);

/** Persist or clear the auth token. */
export const setToken = (token: string | null): void => {
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
};

/**
 * Shared Axios instance for all REST calls.
 *
 * - Attaches the bearer token to every request.
 * - On a 401 response, clears the token and redirects to /login so the user
 *   re-authenticates (handles expired/invalid tokens globally).
 */
export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
  const token = getToken();
  if (token) {
    cfg.headers.set('Authorization', `Bearer ${token}`);
  }
  return cfg;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      setToken(null);
      // Avoid redirect loops if we're already on an auth page.
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  },
);

/**
 * Extract a human-readable message from an unknown error (typically an Axios
 * error whose body follows our `{ success:false, message }` envelope).
 */
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return (
      (error.response?.data as { message?: string } | undefined)?.message ??
      error.message
    );
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
};

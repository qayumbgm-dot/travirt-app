import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';

const BASE_URL =
  (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3001/api';

// Access token lives in module memory — NOT localStorage.
// This means it survives navigation but not a hard refresh (intentional; refresh
// cookie restores the session on next mount via authApi.tryRestoreSession()).
let _accessToken: string | null = null;

export const setAccessToken = (token: string | null): void => {
  _accessToken = token;
};

export const getAccessToken = (): string | null => _accessToken;

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,  // sends the httpOnly refresh_token cookie
  headers: { 'Content-Type': 'application/json' },
});

// Attach access token to every outgoing request
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (_accessToken) {
    config.headers.Authorization = `Bearer ${_accessToken}`;
  }
  return config;
});

// On 401: attempt one silent refresh, then retry the original request
let isRefreshing = false;
let refreshWaiters: Array<(token: string | null) => void> = [];

const drainQueue = (token: string | null) => {
  refreshWaiters.forEach((cb) => cb(token));
  refreshWaiters = [];
};

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // Don't retry the refresh endpoint itself
    if (original.url?.includes('/auth/refresh')) {
      return Promise.reject(error);
    }

    original._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        refreshWaiters.push((newToken) => {
          if (newToken) {
            original.headers.Authorization = `Bearer ${newToken}`;
            resolve(apiClient(original));
          } else {
            reject(error);
          }
        });
      });
    }

    isRefreshing = true;

    try {
      const { data } = await axios.post<{ accessToken: string }>(
        `${BASE_URL}/auth/refresh`,
        {},
        { withCredentials: true },
      );
      setAccessToken(data.accessToken);
      drainQueue(data.accessToken);
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return apiClient(original);
    } catch {
      setAccessToken(null);
      drainQueue(null);
      // Hard-redirect to login — the refresh cookie has expired
      window.dispatchEvent(new CustomEvent('auth:expired'));
      return Promise.reject(error);
    } finally {
      isRefreshing = false;
    }
  },
);

import { apiClient, setAccessToken } from './client';

export interface AuthUser {
  id: string;
  userId: string;
  email: string;
  displayName: string | null;
  role: string;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export type LoginResult =
  | { requires2FA: false; accessToken: string; user: AuthUser }
  | { requires2FA: true;  tempToken: string;   userId: string };

const extractMessage = (err: unknown): string => {
  const data = (err as any)?.response?.data;
  return data?.error ?? data?.message ?? 'Something went wrong. Please try again.';
};

export const authApi = {
  register: async (payload: {
    userId: string;
    email: string;
    password: string;
    displayName?: string;
  }): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/register', payload);
    setAccessToken(data.accessToken);
    return data;
  },

  login: async (identifier: string, password: string): Promise<LoginResult> => {
    const { data } = await apiClient.post<LoginResult>('/auth/login', { identifier, password });
    if (!data.requires2FA) {
      setAccessToken(data.accessToken);
    }
    return data;
  },

  verify2fa: async (tempToken: string, code: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/2fa-verify', { tempToken, code });
    setAccessToken(data.accessToken);
    return data;
  },

  forgotPassword: async (email: string): Promise<void> => {
    await apiClient.post('/auth/forgot-password', { email });
  },

  resetPassword: async (token: string, password: string): Promise<void> => {
    await apiClient.post('/auth/reset-password', { token, password });
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Best-effort logout — always clear local state
    }
    setAccessToken(null);
  },

  // Called on app mount to silently restore a session from the httpOnly cookie
  tryRestoreSession: async (): Promise<AuthUser | null> => {
    try {
      const { data } = await apiClient.post<{ accessToken: string }>('/auth/refresh');
      setAccessToken(data.accessToken);
      const { data: user } = await apiClient.get<AuthUser>('/auth/me');
      return user;
    } catch {
      setAccessToken(null);
      return null;
    }
  },

  me: async (): Promise<AuthUser> => {
    const { data } = await apiClient.get<AuthUser>('/auth/me');
    return data;
  },

  extractMessage,
};

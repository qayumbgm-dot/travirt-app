import { apiClient } from './client';

export const settingsApi = {
  get: () => apiClient.get<Record<string, unknown>>('/settings').then((r) => r.data),
  save: (settings: Record<string, unknown>) => apiClient.put('/settings', settings),
};

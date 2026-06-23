import { apiClient } from './client';

export const brokerApi = {
  getStatus: () =>
    apiClient.get<{ connected: boolean; broker?: string; brokerUserId?: string }>('/broker/status').then(r => r.data),

  connect: (brokerUserId: string, apiKey: string) =>
    apiClient.post('/broker/connect', { brokerUserId, apiKey }).then(r => r.data),

  disconnect: () =>
    apiClient.delete('/broker/connect').then(r => r.data),

  // Exchange Alice Blue ANT OAuth callback params for a live session.
  aliceCallback: (authCode: string, userId: string, appcode: string) =>
    apiClient.post<{ ok: boolean; mode: string }>('/broker/alice-callback', { authCode, userId, appcode }).then(r => r.data),
};

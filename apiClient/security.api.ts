import { apiClient } from './client';

export interface TwoFaStatus {
  enabled:                boolean;
  createdAt:              string | null;
  remainingRecoveryCodes: number;
}

export interface TwoFaSetupResult {
  secret:        string;
  otpAuthUri:    string;
  qrDataUrl:     string;
  recoveryCodes: string[];
}

export const securityApi = {
  get2faStatus: async (): Promise<TwoFaStatus> => {
    const { data } = await apiClient.get<TwoFaStatus>('/security/2fa/status');
    return data;
  },

  setup2fa: async (): Promise<TwoFaSetupResult> => {
    const { data } = await apiClient.post<TwoFaSetupResult>('/security/2fa/setup', {});
    return data;
  },

  enable2fa: async (code: string): Promise<void> => {
    await apiClient.post('/security/2fa/enable', { code });
  },

  disable2fa: async (code: string): Promise<void> => {
    await apiClient.post('/security/2fa/disable', { code });
  },
};

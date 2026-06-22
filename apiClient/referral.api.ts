import { apiClient } from './client';

export interface ReferralStats {
  code: string;
  totalUses: number;
  pendingRewards: number;
  nxoEarned: number;
  hasAppliedCode: boolean;
  appliedCode: string | null;
}

export const referralApi = {
  getCode: () =>
    apiClient.get<{ code: string }>('/referrals/code').then((r) => r.data.code),

  getStats: () =>
    apiClient.get<ReferralStats>('/referrals/stats').then((r) => r.data),

  applyCode: (code: string) =>
    apiClient.post<{ message: string }>('/referrals/apply', { code }).then((r) => r.data),
};

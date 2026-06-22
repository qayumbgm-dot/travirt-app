import { apiClient } from './client';

export interface LeaderEntry {
  rank: number;
  userId: string;
  displayName: string;
  portfolioValue: number;
  totalDeposited: number;
  returnPct: number;
  pnl: number;
  tradeCount: number;
}

export interface LeaderboardResponse {
  data: LeaderEntry[];
  cached: boolean;
  computedAt: number;
}

export const leaderboardApi = {
  get: () => apiClient.get<LeaderboardResponse>('/leaderboard').then((r) => r.data),
};

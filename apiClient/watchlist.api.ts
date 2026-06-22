import { apiClient } from './client';

export interface ApiWatchlistSymbol {
  id: string;
  watchlist_id: string;
  group_id: string | null;
  symbol: string;
  exchange: string;
  sort_order: number;
  notes: string | null;
}

export interface ApiWatchlistGroup {
  id: string;
  watchlist_id: string;
  name: string;
  sort_order: number;
  symbols: ApiWatchlistSymbol[];
}

export interface ApiWatchlist {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
  groups: ApiWatchlistGroup[];
  ungrouped: ApiWatchlistSymbol[];
}

export const watchlistApi = {
  getAll: () => apiClient.get<ApiWatchlist[]>('/watchlists').then((r) => r.data),

  create: (name: string) =>
    apiClient.post<ApiWatchlist>('/watchlists', { name }).then((r) => r.data),

  rename: (id: string, name: string) =>
    apiClient.patch(`/watchlists/${id}`, { name }),

  delete: (id: string) => apiClient.delete(`/watchlists/${id}`),

  createGroup: (watchlistId: string, name: string) =>
    apiClient.post<ApiWatchlistGroup>(`/watchlists/${watchlistId}/groups`, { name }).then((r) => r.data),

  deleteGroup: (watchlistId: string, groupId: string) =>
    apiClient.delete(`/watchlists/${watchlistId}/groups/${groupId}`),

  addSymbol: (watchlistId: string, symbol: string, exchange: string, groupId?: string) =>
    apiClient
      .post<ApiWatchlistSymbol>(`/watchlists/${watchlistId}/symbols`, { symbol, exchange, groupId })
      .then((r) => r.data),

  removeSymbol: (watchlistId: string, symbolId: string) =>
    apiClient.delete(`/watchlists/${watchlistId}/symbols/${symbolId}`),

  setNote: (watchlistId: string, symbolId: string, notes: string) =>
    apiClient.patch(`/watchlists/${watchlistId}/symbols/${symbolId}/note`, { notes }),
};

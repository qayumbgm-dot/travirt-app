import { apiClient, getAccessToken } from './client';

// ─── Types mirroring DB rows ──────────────────────────────────────────────────

export interface ApiBalances {
  inr_balance: number;
  nxo_balance: number;
  virtual_balance: number;
  daily_bonus_claimed: boolean;
  daily_bonus_date: string | null;
}

export interface ApiPosition {
  id: string;
  symbol: string;
  exchange: string;
  quantity: number;
  avg_price: number;
}

export interface ApiOrder {
  id: string;
  symbol: string;
  exchange: string;
  quantity: number;
  price: number | null;
  order_type: string;
  transaction_type: string;
  variety: string | null;
  status: string;
  validity: string | null;
  stop_loss: number | null;
  take_profit: number | null;
  trigger_price: number | null;
  executed_at: string;
}

export interface ApiTransaction {
  id: string;
  type: string;
  description: string;
  amount: string;
  created_at: string;
}

export interface ApiGttOrder {
  id: string;
  symbol: string;
  exchange: string | null;
  transaction_type: string;
  trigger_type: string;
  quantity: number;
  status: string;
  trigger_price: number | null;
  limit_price: number | null;
  stoploss_trigger_price: number | null;
  stoploss_limit_price: number | null;
  target_trigger_price: number | null;
  target_limit_price: number | null;
  created_at: string;
  expires_at: string;
}

export interface ApiAlert {
  id: string;
  symbol: string;
  exchange: string | null;
  property: string;
  operator: string;
  value: number;
  type: string;
  status: string;
  created_at: string;
  expires_at: string;
}

export interface ApiPortfolio {
  balances: ApiBalances;
  positions: ApiPosition[];
  orders: ApiOrder[];
  transactions: ApiTransaction[];
  gttOrders: ApiGttOrder[];
  alerts: ApiAlert[];
  totalInvested: number;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const portfolioApi = {
  getAll: () => apiClient.get<ApiPortfolio>('/portfolio').then((r) => r.data),

  getBalances: () => apiClient.get<ApiBalances>('/portfolio/balances').then((r) => r.data),

  getPositions: () => apiClient.get<ApiPosition[]>('/portfolio/positions').then((r) => r.data),

  getOrders: () => apiClient.get<ApiOrder[]>('/portfolio/orders').then((r) => r.data),

  getTransactions: () => apiClient.get<ApiTransaction[]>('/portfolio/transactions').then((r) => r.data),

  getGttOrders: () => apiClient.get<ApiGttOrder[]>('/portfolio/gtt').then((r) => r.data),

  createGttOrder: (data: Omit<ApiGttOrder, 'id' | 'created_at' | 'expires_at' | 'status'>) =>
    apiClient.post<ApiGttOrder>('/portfolio/gtt', data).then((r) => r.data),

  deleteGttOrder: (id: string) => apiClient.delete(`/portfolio/gtt/${id}`),

  getAlerts: () => apiClient.get<ApiAlert[]>('/portfolio/alerts').then((r) => r.data),

  createAlert: (data: Omit<ApiAlert, 'id' | 'created_at' | 'expires_at' | 'status'>) =>
    apiClient.post<ApiAlert>('/portfolio/alerts', data).then((r) => r.data),

  deleteAlert: (id: string) => apiClient.delete(`/portfolio/alerts/${id}`),

  claimDailyBonus: () =>
    apiClient.post<{ message: string }>('/portfolio/daily-bonus').then((r) => r.data),

  downloadExport: async (type: 'orders' | 'transactions'): Promise<void> => {
    const token = getAccessToken();
    const baseUrl = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:3001/api';
    const res = await fetch(`${baseUrl}/portfolio/export?type=${type}`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `travirt_${type}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

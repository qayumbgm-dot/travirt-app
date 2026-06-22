import { apiClient } from './client';
import type { ApiOrder } from './portfolio.api';

export interface TradeRequest {
  symbol: string;
  exchange: string;
  quantity: number;
  price: number;
  orderType: 'MARKET' | 'LIMIT' | 'SL' | 'SLM';
  transactionType: 'BUY' | 'SELL';
  variety?: string;
  validity?: string;
  stopLoss?: number;
  takeProfit?: number;
  triggerPrice?: number;
}

export interface PendingOrder {
  id: string;
  user_id: string;
  symbol: string;
  exchange: string;
  transaction_type: 'BUY' | 'SELL';
  order_type: 'LMT' | 'SL' | 'SLM';
  quantity: number;
  limit_price: number;
  trigger_price: number | null;
  status: 'PENDING' | 'FILLED' | 'CANCELLED' | 'EXPIRED';
  created_at: string;
  expires_at: string;
}

export type TradeResult =
  | { pending: false; order: ApiOrder; newBalance: number }
  | { pending: true; order: PendingOrder; newBalance: number };

export const tradeApi = {
  placeOrder: (trade: TradeRequest) =>
    apiClient.post<TradeResult>('/trade/orders', trade).then((r) => r.data),

  getPendingOrders: () =>
    apiClient.get<PendingOrder[]>('/trade/orders/pending').then((r) => r.data),

  cancelPendingOrder: (id: string) =>
    apiClient.delete<{ message: string }>(`/trade/orders/pending/${id}`).then((r) => r.data),
};

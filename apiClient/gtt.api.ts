import { apiClient } from './client';

export interface GttOrder {
  id: string;
  user_id: string;
  symbol: string;
  exchange: string;
  transaction_type: 'BUY' | 'SELL';
  trigger_type: 'SINGLE' | 'OCO';
  quantity: number;
  trigger_price: number | null;
  limit_price: number | null;
  stoploss_trigger_price: number | null;
  stoploss_limit_price: number | null;
  target_trigger_price: number | null;
  target_limit_price: number | null;
  status: 'ACTIVE' | 'TRIGGERED' | 'CANCELLED' | 'FAILED';
  expires_at: string;
  created_at: string;
}

export type CreateSingleGtt = {
  triggerType: 'SINGLE';
  symbol: string;
  exchange: string;
  transactionType: 'BUY' | 'SELL';
  quantity: number;
  triggerPrice: number;
  limitPrice?: number;
};

export type CreateOcoGtt = {
  triggerType: 'OCO';
  symbol: string;
  exchange: string;
  transactionType: 'SELL';
  quantity: number;
  stoplossTriggerPrice: number;
  stoplossLimitPrice?: number;
  targetTriggerPrice: number;
  targetLimitPrice?: number;
};

export type CreateGttPayload = CreateSingleGtt | CreateOcoGtt;

export const gttApi = {
  list: () =>
    apiClient.get<GttOrder[]>('/gtt').then((r) => r.data),

  create: (payload: CreateGttPayload) =>
    apiClient.post<GttOrder>('/gtt', payload).then((r) => r.data),

  cancel: (id: string) =>
    apiClient.delete<{ message: string }>(`/gtt/${id}`).then((r) => r.data),
};

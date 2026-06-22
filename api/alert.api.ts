import { apiClient } from './client';

export type AlertProperty = 'LTP' | 'CHANGE' | 'CHANGE%' | 'VOLUME' | 'HIGH' | 'LOW';
export type AlertOperator = '>' | '<' | '>=' | '<=' | '=';
export type AlertType = 'ALERT_ONLY' | 'ATO';
export type AlertStatus = 'ACTIVE' | 'TRIGGERED' | 'CANCELLED' | 'EXPIRED';

export interface AlertRecord {
  id: string;
  user_id: string;
  symbol: string;
  exchange: string;
  property: AlertProperty;
  operator: AlertOperator;
  value: number;
  type: AlertType;
  status: AlertStatus;
  expires_at: string;
  created_at: string;
}

export interface CreateAlertPayload {
  symbol: string;
  exchange: string;
  property: AlertProperty;
  operator: AlertOperator;
  value: number;
  type?: AlertType;
}

export const alertApi = {
  list: () =>
    apiClient.get<AlertRecord[]>('/alerts').then((r) => r.data),

  create: (payload: CreateAlertPayload) =>
    apiClient.post<AlertRecord>('/alerts', payload).then((r) => r.data),

  cancel: (id: string) =>
    apiClient.delete<{ message: string }>(`/alerts/${id}`).then((r) => r.data),
};

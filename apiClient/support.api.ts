import { apiClient } from './client';

export interface SupportTicket {
  id: string;
  subject: string;
  category: string;
  status: string;
  created_at: string;
}

export const supportApi = {
  submit: (subject: string, message: string, category?: string) =>
    apiClient
      .post<{ id: string; message: string }>('/support/tickets', { subject, message, category })
      .then((r) => r.data),

  list: () => apiClient.get<SupportTicket[]>('/support/tickets').then((r) => r.data),
};

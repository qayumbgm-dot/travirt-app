import { apiClient } from './client';

export interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  role: string;
  is_verified: boolean;
  created_at: string;
  last_login_at: string | null;
  virtual_balance: number | null;
  order_count: number;
}

export interface PlatformStats {
  totalUsers: number;
  usersToday: number;
  totalOrders: number;
  ordersToday: number;
  openTickets: number;
  totalTickets: number;
}

export interface AdminTicket {
  id: string;
  user_id: string;
  user_user_id: string;
  email: string;
  subject: string;
  category: string | null;
  status: string;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  resource: string;
  detail_json: unknown;
  ip_address: string | null;
  created_at: string;
  user_handle: string | null;
  email: string | null;
}

export const adminApi = {
  getStats: () =>
    apiClient.get<PlatformStats>('/admin/stats').then((r) => r.data),

  listUsers: (page = 1, limit = 20, search = '') =>
    apiClient
      .get<{ users: AdminUser[]; total: number }>('/admin/users', {
        params: { page, limit, search },
      })
      .then((r) => r.data),

  updateUserRole: (id: string, role: string) =>
    apiClient.patch<{ success: boolean }>(`/admin/users/${id}`, { role }).then((r) => r.data),

  listTickets: (status?: string) =>
    apiClient
      .get<AdminTicket[]>('/admin/tickets', { params: status ? { status } : {} })
      .then((r) => r.data),

  updateTicketStatus: (id: string, status: string) =>
    apiClient.patch<{ success: boolean }>(`/admin/tickets/${id}`, { status }).then((r) => r.data),

  getAuditLog: (params?: { userId?: string; action?: string; limit?: number }) =>
    apiClient.get<AuditEntry[]>('/admin/audit', { params }).then((r) => r.data),
};

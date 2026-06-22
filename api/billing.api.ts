import { apiClient } from './client';

export interface PlanFeatures {
  watchlists:      number;   // -1 = unlimited
  alerts:          number;   // -1 = unlimited
  aiNews:          boolean;
  leaderboard:     boolean;
  virtualBalance:  number;
  prioritySupport: boolean;
  propFirmReports: boolean;
}

export interface PlanCatalogue {
  id:            string;
  name:          string;
  display_name:  string;
  price_inr:     number;
  features:      PlanFeatures;
  sort_order:    number;
}

export interface BillingStatus {
  planName:          string;
  displayName:       string;
  priceInr:          number;
  features:          PlanFeatures;
  status:            string;
  periodEnd:         string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId:  string | null;
  stripeConfigured:  boolean;
}

export const billingApi = {
  getPlans: async (): Promise<PlanCatalogue[]> => {
    const res = await apiClient.get<{ plans: PlanCatalogue[] }>('/billing/plans');
    return res.data.plans;
  },

  getStatus: async (): Promise<BillingStatus> => {
    const res = await apiClient.get<BillingStatus>('/billing/status');
    return res.data;
  },

  createCheckoutSession: async (planName: 'pro' | 'elite'): Promise<string> => {
    const res = await apiClient.post<{ url: string }>('/billing/checkout', { planName });
    return res.data.url;
  },

  openPortal: async (): Promise<string> => {
    const res = await apiClient.get<{ url: string }>('/billing/portal');
    return res.data.url;
  },
};

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
  planName:               string;
  displayName:            string;
  priceInr:               number;
  features:               PlanFeatures;
  status:                 string;
  periodEnd:              string | null;
  cancelAtPeriodEnd:      boolean;
  razorpaySubscriptionId: string | null;
  razorpayConfigured:     boolean;
}

export interface RazorpayOrder {
  subscriptionId: string;
  keyId:          string;
  planName:       string;
}

export interface VerifyPaymentParams {
  razorpayPaymentId:      string;
  razorpaySubscriptionId: string;
  razorpaySignature:      string;
  planName:               'pro' | 'elite';
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

  createOrder: async (planName: 'pro' | 'elite'): Promise<RazorpayOrder> => {
    const res = await apiClient.post<RazorpayOrder>('/billing/checkout', { planName });
    return res.data;
  },

  verifyPayment: async (params: VerifyPaymentParams): Promise<void> => {
    await apiClient.post('/billing/verify', params);
  },

  cancelSubscription: async (): Promise<void> => {
    await apiClient.post('/billing/cancel', {});
  },
};

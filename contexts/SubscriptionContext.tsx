import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { billingApi, BillingStatus, PlanFeatures } from '../apiClient/billing.api';

interface SubscriptionContextValue {
  plan: BillingStatus | null;
  features: PlanFeatures;
  isLoading: boolean;
  refresh: () => void;
}

const FREE_FEATURES: PlanFeatures = {
  watchlists:      1,
  alerts:          10,
  aiNews:          false,
  leaderboard:     true,
  virtualBalance:  100_000,
  prioritySupport: false,
  propFirmReports: false,
};

const SubscriptionContext = createContext<SubscriptionContextValue>({
  plan:      null,
  features:  FREE_FEATURES,
  isLoading: true,
  refresh:   () => {},
});

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [plan, setPlan]         = useState<BillingStatus | null>(null);
  const [isLoading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setPlan(await billingApi.getStatus());
    } catch {
      // non-fatal — free tier assumed
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <SubscriptionContext.Provider value={{ plan, features: plan?.features ?? FREE_FEATURES, isLoading, refresh: load }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => useContext(SubscriptionContext);

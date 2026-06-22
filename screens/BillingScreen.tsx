import React, { useEffect, useState, useCallback } from 'react';
import { billingApi, BillingStatus, PlanCatalogue } from '../apiClient/billing.api';

const fmt = (paise: number) =>
  paise === 0 ? 'Free' : `₹${(paise / 100).toLocaleString('en-IN')}/mo`;

const featureRow = (label: string, value: string | boolean | number) => {
  if (typeof value === 'boolean') {
    return (
      <li key={label} className="flex items-center gap-2 text-sm text-text-secondary">
        <i className={`fas ${value ? 'fa-check text-success' : 'fa-times text-muted'} w-4 text-center`} />
        {label}
      </li>
    );
  }
  const display = value === -1 ? 'Unlimited' : String(value);
  return (
    <li key={label} className="flex items-center gap-2 text-sm text-text-secondary">
      <i className="fas fa-check text-success w-4 text-center" />
      {display} {label}
    </li>
  );
};

interface PlanCardProps {
  plan:      PlanCatalogue;
  isCurrent: boolean;
  loading:   boolean;
  onUpgrade: (name: 'pro' | 'elite') => void;
}

const PlanCard: React.FC<PlanCardProps> = ({ plan, isCurrent, loading, onUpgrade }) => {
  const f = plan.features;
  const isPaid = plan.price_inr > 0;
  const isElite = plan.name === 'elite';

  return (
    <div className={`relative flex flex-col rounded-xl border p-6 transition-all ${
      isCurrent
        ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
        : isElite
          ? 'border-amber-500/50 bg-amber-500/5 hover:border-amber-500'
          : 'border-overlay bg-surface hover:border-primary/50'
    }`}>
      {isCurrent && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">
          Current Plan
        </span>
      )}
      {isElite && !isCurrent && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-full">
          Best Value
        </span>
      )}

      <div className="mb-4">
        <h3 className="text-xl font-bold text-text-primary">{plan.display_name}</h3>
        <p className="text-3xl font-extrabold text-text-primary mt-1">
          {fmt(plan.price_inr)}
        </p>
      </div>

      <ul className="space-y-2 flex-1 mb-6">
        {featureRow('Watchlists', f.watchlists)}
        {featureRow('Price Alerts', f.alerts)}
        {featureRow('AI News Feed', f.aiNews)}
        {featureRow('Leaderboard', f.leaderboard)}
        {featureRow('Priority Support', f.prioritySupport)}
        {featureRow('Prop Firm Reports', f.propFirmReports)}
        <li className="flex items-center gap-2 text-sm text-text-secondary">
          <i className="fas fa-wallet text-primary w-4 text-center" />
          ₹{(f.virtualBalance / 100).toLocaleString('en-IN')} virtual balance
        </li>
      </ul>

      {isCurrent ? (
        <div className="py-2 text-center text-sm font-semibold text-primary">Active</div>
      ) : isPaid ? (
        <button
          disabled={loading}
          onClick={() => onUpgrade(plan.name as 'pro' | 'elite')}
          className={`w-full py-2.5 rounded-lg font-semibold text-sm transition-all disabled:opacity-60 ${
            isElite
              ? 'bg-amber-500 hover:bg-amber-400 text-white'
              : 'bg-primary hover:bg-primary-focus text-white'
          }`}
        >
          {loading ? 'Redirecting…' : `Upgrade to ${plan.display_name}`}
        </button>
      ) : null}
    </div>
  );
};

const BillingScreen: React.FC = () => {
  const [status,  setStatus]  = useState<BillingStatus | null>(null);
  const [plans,   setPlans]   = useState<PlanCatalogue[]>([]);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, p] = await Promise.all([billingApi.getStatus(), billingApi.getPlans()]);
      setStatus(s);
      setPlans(p);
    } catch {
      setError('Failed to load billing information.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Check for Stripe redirect result in URL hash
    const hash = window.location.hash;
    if (hash.includes('success=1')) {
      window.location.hash = '#billing';
      setTimeout(load, 1500); // re-fetch after short delay for webhook processing
    }
  }, [load]);

  const handleUpgrade = async (planName: 'pro' | 'elite') => {
    if (!status?.stripeConfigured) {
      setError('Payment processing is not enabled on this server.');
      return;
    }
    setUpgrading(true);
    setError(null);
    try {
      const url = await billingApi.createCheckoutSession(planName);
      window.location.href = url;
    } catch {
      setError('Could not start checkout. Please try again.');
      setUpgrading(false);
    }
  };

  const handlePortal = async () => {
    setUpgrading(true);
    setError(null);
    try {
      const url = await billingApi.openPortal();
      window.open(url, '_blank', 'noopener');
    } catch {
      setError('Could not open billing portal. Please try again.');
    } finally {
      setUpgrading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <i className="fas fa-spinner fa-spin text-primary text-2xl" />
      </div>
    );
  }

  const currentPlanName = status?.planName ?? 'free';
  const isPaidPlan      = currentPlanName !== 'free';
  const periodEnd       = status?.periodEnd ? new Date(status.periodEnd) : null;

  return (
    <div className="flex flex-col min-h-full bg-base animate-fade-in overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto w-full px-6 py-10">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-text-primary">Plans & Billing</h1>
          <p className="text-muted mt-2">Upgrade for more watchlists, AI features, and priority support.</p>
        </div>

        {/* Current plan summary bar */}
        {status && (
          <div className="flex flex-wrap items-center justify-between gap-4 bg-surface rounded-xl border border-overlay px-6 py-4 mb-8">
            <div>
              <p className="text-sm text-muted">Current plan</p>
              <p className="font-semibold text-text-primary">{status.displayName}</p>
              {periodEnd && (
                <p className="text-xs text-muted mt-0.5">
                  {status.cancelAtPeriodEnd ? 'Cancels' : 'Renews'} on{' '}
                  {periodEnd.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
            {isPaidPlan && (
              <button
                disabled={upgrading}
                onClick={handlePortal}
                className="px-4 py-2 rounded-lg border border-overlay hover:border-primary text-sm font-medium text-text-secondary hover:text-primary transition-colors disabled:opacity-60"
              >
                <i className="fas fa-external-link-alt mr-2" />
                Manage Subscription
              </button>
            )}
          </div>
        )}

        {error && (
          <div className="mb-6 px-4 py-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
            {error}
          </div>
        )}

        {!status?.stripeConfigured && (
          <div className="mb-6 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-500 text-sm">
            <i className="fas fa-info-circle mr-2" />
            Payments are not configured on this server. Upgrade buttons are disabled.
          </div>
        )}

        {/* Plan cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isCurrent={plan.name === currentPlanName}
              loading={upgrading}
              onUpgrade={handleUpgrade}
            />
          ))}
        </div>

        {/* FAQ note */}
        <p className="text-center text-xs text-muted mt-8">
          All plans include virtual trading with zero real-money risk.
          Paid plans are billed monthly in INR. Cancel anytime via the billing portal.
        </p>
      </div>
    </div>
  );
};

export default BillingScreen;

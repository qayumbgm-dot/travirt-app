import React, { useState } from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';

interface Props {
  onManagePlan: () => void;
}

const SubscriptionBanner: React.FC<Props> = ({ onManagePlan }) => {
  const { plan, isLoading } = useSubscription();
  const [dismissed, setDismissed] = useState(false);

  if (isLoading || dismissed || !plan) return null;

  const isTrialing    = plan.status === 'trialing';
  const isCancelling  = plan.cancelAtPeriodEnd && plan.periodEnd != null;
  if (!isTrialing && !isCancelling) return null;

  const daysLeft = plan.periodEnd
    ? Math.max(0, Math.ceil((new Date(plan.periodEnd).getTime() - Date.now()) / 86_400_000))
    : null;

  const trialMsg = `You're on a ${plan.displayName} trial${daysLeft !== null ? ` — ${daysLeft} day${daysLeft === 1 ? '' : 's'} left` : ''}. Upgrade to keep access.`;
  const cancelMsg = `Your ${plan.displayName} plan will cancel${daysLeft !== null ? ` in ${daysLeft} day${daysLeft === 1 ? '' : 's'}` : ' soon'}. Renew to keep your benefits.`;

  const isUrgent = daysLeft !== null && daysLeft <= 3;
  const colorCls = isUrgent
    ? 'bg-danger/15 border-danger/30 text-red-300'
    : isTrialing
      ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
      : 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300';

  return (
    <div className={`flex items-center justify-between px-4 py-2 text-xs border-b ${colorCls} shrink-0`}>
      <span>
        <i className="fas fa-exclamation-circle mr-1.5"></i>
        {isTrialing ? trialMsg : cancelMsg}
      </span>
      <div className="flex items-center gap-3 ml-4">
        <button onClick={onManagePlan} className="font-bold underline hover:no-underline whitespace-nowrap">
          {isTrialing ? 'Upgrade Now' : 'Manage Plan'}
        </button>
        <button onClick={() => setDismissed(true)} className="opacity-60 hover:opacity-100">
          <i className="fas fa-times"></i>
        </button>
      </div>
    </div>
  );
};

export default SubscriptionBanner;

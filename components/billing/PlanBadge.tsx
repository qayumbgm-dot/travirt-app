import React from 'react';
import { useSubscription } from '../../contexts/SubscriptionContext';

const STYLE: Record<string, string> = {
  free:  'bg-overlay text-muted border border-overlay',
  pro:   'bg-primary/15 text-primary border border-primary/30',
  elite: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
};

const PlanBadge: React.FC = () => {
  const { plan, isLoading } = useSubscription();
  if (isLoading || !plan) return null;

  const style = STYLE[plan.planName] ?? STYLE.free;
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${style}`}>
      {plan.displayName}
    </span>
  );
};

export default PlanBadge;

import React from 'react';

interface Props {
  feature:      string;
  requiredPlan: 'Pro' | 'Elite';
  onUpgrade?:   () => void;
}

const UpgradePrompt: React.FC<Props> = ({ feature, requiredPlan, onUpgrade }) => (
  <div className="flex flex-col items-center justify-center h-full py-24 px-8 text-center">
    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
      <i className="fas fa-lock text-primary text-2xl"></i>
    </div>
    <h3 className="text-2xl font-bold text-text-primary mb-2">{feature} is a Pro feature</h3>
    <p className="text-muted mb-6 max-w-sm">
      Upgrade to{' '}
      <span className={`font-semibold ${requiredPlan === 'Elite' ? 'text-amber-400' : 'text-primary'}`}>
        {requiredPlan}
      </span>{' '}
      to unlock {feature} and more.
    </p>
    {onUpgrade && (
      <button
        onClick={onUpgrade}
        className={`px-6 py-2.5 font-semibold rounded-lg transition-colors text-white ${
          requiredPlan === 'Elite'
            ? 'bg-amber-500 hover:bg-amber-400'
            : 'bg-primary hover:bg-primary-focus'
        }`}
      >
        Upgrade to {requiredPlan}
      </button>
    )}
  </div>
);

export default UpgradePrompt;

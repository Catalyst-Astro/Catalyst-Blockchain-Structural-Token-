import React from 'react';

interface RiskMeterProps {
  value: number;
}

const RiskMeter: React.FC<RiskMeterProps> = ({ value }) => {
  const normalized = Math.max(0, Math.min(100, value));
  const tone =
    normalized >= 70
      ? 'from-red-500 to-orange-500'
      : normalized >= 45
      ? 'from-amber-500 to-orange-400'
      : 'from-emerald-500 to-teal-500';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted">Risk index</span>
        <span className="font-semibold">{normalized}%</span>
      </div>
      <div className="h-2 rounded-full bg-border/70">
        <div
          className={`h-2 rounded-full bg-gradient-to-r ${tone} transition-all duration-200`}
          style={{ width: `${normalized}%` }}
          aria-hidden
        />
      </div>
    </div>
  );
};

export default RiskMeter;

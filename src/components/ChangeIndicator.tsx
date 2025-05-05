import React from 'react';
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

interface ChangeIndicatorProps {
  original: number;
  current: number;
  type: 'pros' | 'hours' | 'cost';
  showDetails?: boolean;
}

const ChangeIndicator: React.FC<ChangeIndicatorProps> = ({ original, current, type, showDetails = true }) => {
  if (original === current) return null;

  const percentChange = ((current - original) / original) * 100;
  const isIncrease = current > original;
  const Icon = isIncrease ? TrendingUp : TrendingDown;

  const formatValue = (value: number) => {
    switch (type) {
      case 'pros':
        return `${value} ${value === 1 ? 'Professional' : 'Professionals'}`;
      case 'hours':
        return `${value} ${value === 1 ? 'Hour' : 'Hours'}`;
      case 'cost':
        return `$${value.toFixed(2)}`;
    }
  };

  return (
    <div className="flex items-center gap-2">
      {showDetails && (
        <>
          <span className="text-gray-500 line-through">{formatValue(original)}</span>
          <ArrowRight className="w-4 h-4 text-gray-400" />
        </>
      )}
      <span className={`font-medium ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
        {formatValue(current)}
      </span>
      <div className={`flex items-center gap-1 text-sm ${isIncrease ? 'text-green-600' : 'text-red-600'}`}>
        <Icon className="w-4 h-4" />
        <span>
          {isIncrease ? '+' : ''}
          {percentChange.toFixed(1)}%
        </span>
      </div>
    </div>
  );
};

export default ChangeIndicator;
import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface ChangeIndicator {
  original: number;
  updated: number;
  percentChange: number;
}

interface ChangeSummaryProps {
  changes: Record<string, ChangeIndicator>;
}

const ChangeSummary: React.FC<ChangeSummaryProps> = ({ changes }) => {
  const calculateTotals = () => {
    const totals = {
      totalChanges: Object.keys(changes).length,
      netHoursChange: 0,
      netProsChange: 0,
      netCostChange: 0
    };

    Object.entries(changes).forEach(([key, change]) => {
      const diff = change.updated - change.original;
      if (key.endsWith('-hours')) totals.netHoursChange += diff;
      if (key.endsWith('-pros')) totals.netProsChange += diff;
      if (key.endsWith('-cost')) totals.netCostChange += diff;
    });

    return totals;
  };

  const totals = calculateTotals();

  const formatChange = (value: number, type: 'hours' | 'pros' | 'cost') => {
    const isPositive = value > 0;
    const Icon = isPositive ? TrendingUp : TrendingDown;
    
    let formattedValue = '';
    switch (type) {
      case 'hours':
        formattedValue = `${Math.abs(value)} ${Math.abs(value) === 1 ? 'Hour' : 'Hours'}`;
        break;
      case 'pros':
        formattedValue = `${Math.abs(value)} ${Math.abs(value) === 1 ? 'Professional' : 'Professionals'}`;
        break;
      case 'cost':
        formattedValue = `$${Math.abs(value).toFixed(2)}`;
        break;
    }

    return (
      <div className={`flex items-center gap-2 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        <Icon className="w-4 h-4" />
        <span className="font-medium">
          {isPositive ? '+' : '-'} {formattedValue}
        </span>
      </div>
    );
  };

  if (totals.totalChanges === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Change Summary</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-sm text-gray-500 mb-1">Total Changes</p>
          <p className="text-2xl font-semibold text-gray-900">
            {totals.totalChanges}
          </p>
        </div>
        
        <div>
          <p className="text-sm text-gray-500 mb-1">Net Hours Change</p>
          {formatChange(totals.netHoursChange, 'hours')}
        </div>
        
        <div>
          <p className="text-sm text-gray-500 mb-1">Net Staff Change</p>
          {formatChange(totals.netProsChange, 'pros')}
        </div>
        
        <div>
          <p className="text-sm text-gray-500 mb-1">Net Cost Change</p>
          {formatChange(totals.netCostChange, 'cost')}
        </div>
      </div>
    </div>
  );
};

export default ChangeSummary;
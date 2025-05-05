import React from 'react';
import { ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';

interface ChangeIndicator {
  original: number | null | undefined;
  updated: number | null | undefined;
  percentChange: number;
  timestamp?: string;
}

interface ChangeComparisonProps {
  changes: Record<string, ChangeIndicator>;
  showTimestamp?: boolean;
}

const ChangeComparison: React.FC<ChangeComparisonProps> = ({ changes, showTimestamp = false }) => {
  const formatValue = (key: string, value: number | null | undefined) => {
    if (value === null || value === undefined) return 'N/A';
    
    if (key.endsWith('-pros')) {
      return `${value} ${value === 1 ? 'Professional' : 'Professionals'}`;
    }
    if (key.endsWith('-hours')) {
      return `${value} ${value === 1 ? 'Hour' : 'Hours'}`;
    }
    if (key.endsWith('-cost')) {
      return `$${value.toFixed(2)}`;
    }
    return value;
  };

  const getChangeType = (key: string) => {
    if (key.endsWith('-pros')) return 'Professionals';
    if (key.endsWith('-hours')) return 'Hours';
    if (key.endsWith('-cost')) return 'Cost';
    return 'Value';
  };

  const getLocationInfo = (key: string) => {
    const [location, date, index] = key.split('-');
    return {
      location,
      date: format(new Date(date), 'MMM d, yyyy'),
      serviceIndex: parseInt(index) + 1
    };
  };

  if (Object.keys(changes).length === 0) {
    return (
      <div className="text-gray-500 text-sm italic">
        No changes have been made to this proposal
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {Object.entries(changes).map(([key, change]) => {
        if (!change.original || !change.updated) return null;
        
        const { location, date, serviceIndex } = getLocationInfo(key);
        const changeType = getChangeType(key);
        const isIncrease = change.percentChange > 0;
        
        return (
          <div key={key} className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-gray-600">
                {location} - Service {serviceIndex}
                <span className="mx-1">•</span>
                {date}
              </div>
              {showTimestamp && change.timestamp && (
                <div className="text-xs text-gray-500">
                  {format(new Date(change.timestamp), 'MMM d, h:mm a')}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-gray-500 line-through">
                {formatValue(key, change.original)}
              </span>
              <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <span className="font-medium text-gray-900">
                {formatValue(key, change.updated)}
              </span>
              <div className={`flex items-center gap-1 text-sm ${
                isIncrease ? 'text-green-600' : 'text-red-600'
              }`}>
                {isIncrease ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                <span className="font-medium">
                  {isIncrease ? '+' : ''}
                  {change.percentChange.toFixed(1)}%
                </span>
              </div>
            </div>
            
            <div className="mt-2 text-xs text-gray-500">
              {changeType} {isIncrease ? 'increased' : 'decreased'} from {formatValue(key, change.original)} to {formatValue(key, change.updated)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ChangeComparison;
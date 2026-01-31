import React, { useState } from 'react';
import { format } from 'date-fns';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface LocationSummaryProps {
  location: string;
  services: any;
  isAutoRecurring?: boolean;
  autoRecurringDiscount?: number;
}

// Helper function to format date for display
const formatDate = (dateString: string): string => {
  try {
    if (!dateString) return 'No Date';

    // Handle TBD case
    if (dateString === 'TBD') return 'Date TBD';

    // If it's already in YYYY-MM-DD format, parse it directly
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return format(date, 'MMM d, yyyy');
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return format(date, 'MMM d, yyyy');
  } catch (err) {
    console.error('Error formatting date:', err);
    return 'Invalid Date';
  }
};

const LocationSummary: React.FC<LocationSummaryProps> = ({ location, services, isAutoRecurring, autoRecurringDiscount }) => {
  const [showAllDates, setShowAllDates] = useState(false);
  const dates = Object.keys(services).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  const totalAppointments = Object.values(services).reduce((sum: number, dateData: any) => {
    if (typeof dateData.totalAppointments === 'number') {
      return sum + dateData.totalAppointments;
    }
    return sum;
  }, 0);

  const totalCost = Object.values(services).reduce((sum: number, dateData: any) =>
    sum + dateData.totalCost, 0
  );

  // Calculate discounted cost if auto-recurring
  const discountMultiplier = isAutoRecurring && autoRecurringDiscount ? autoRecurringDiscount / 100 : 0;
  const discountedCost = isAutoRecurring ? totalCost * (1 - discountMultiplier) : totalCost;

  const uniqueServices = new Set();
  Object.values(services).forEach((dateData: any) => {
    dateData.services.forEach((service: any) => {
      uniqueServices.add(service.serviceType);
    });
  });

  // For dates display - show first 2 dates, then expandable for more
  const MAX_VISIBLE_DATES = 2;
  const hasMoreDates = dates.length > MAX_VISIBLE_DATES;
  const visibleDates = showAllDates ? dates : dates.slice(0, MAX_VISIBLE_DATES);
  const hiddenCount = dates.length - MAX_VISIBLE_DATES;

  return (
    <div className="card-large bg-gradient-to-br from-shortcut-teal/20 to-shortcut-teal/10 border-2 border-shortcut-teal border-opacity-30">
      <h3 className="text-xl font-extrabold mb-8 text-shortcut-navy-blue">{location} Summary</h3>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <span className="font-semibold text-shortcut-navy-blue text-lg flex-shrink-0">Date(s):</span>
          <div className="text-right ml-4">
            {dates.length <= MAX_VISIBLE_DATES ? (
              // Few dates - show inline
              <span className="text-shortcut-navy-blue font-semibold text-lg">
                {dates.map(date => formatDate(date)).join(', ')}
              </span>
            ) : (
              // Many dates - show as expandable list
              <div className="space-y-1">
                {visibleDates.map((date, index) => (
                  <div key={date} className="text-shortcut-navy-blue font-semibold text-lg">
                    {formatDate(date)}
                  </div>
                ))}
                {hasMoreDates && (
                  <button
                    onClick={() => setShowAllDates(!showAllDates)}
                    className="flex items-center gap-1 text-shortcut-red hover:text-shortcut-navy-blue font-bold text-sm mt-2 transition-colors"
                  >
                    {showAllDates ? (
                      <>
                        <ChevronUp size={16} />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown size={16} />
                        +{hiddenCount} more date{hiddenCount !== 1 ? 's' : ''}
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-shortcut-navy-blue text-lg">Service(s):</span>
          <span className="text-shortcut-navy-blue font-semibold text-lg text-right">
            {Array.from(uniqueServices).join(', ')}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="font-semibold text-shortcut-navy-blue text-lg">Appointments:</span>
          <span className="text-shortcut-navy-blue font-extrabold text-2xl">
            {totalAppointments === 0 ? '∞' : totalAppointments}
          </span>
        </div>
        <div className="flex justify-between items-center pt-4 border-t-2 border-shortcut-navy-blue">
          <span className="font-extrabold text-shortcut-navy-blue text-lg">Total Cost:</span>
          <div className="text-right">
            {isAutoRecurring && autoRecurringDiscount ? (
              <>
                <span className="text-shortcut-navy-blue/60 font-semibold text-lg line-through mr-2">
                  ${totalCost.toFixed(2)}
                </span>
                <span className="text-green-600 font-extrabold text-2xl">
                  ${discountedCost.toFixed(2)}
                </span>
                <div className="text-xs text-green-600 font-bold mt-1">
                  {autoRecurringDiscount}% recurring discount applied
                </div>
              </>
            ) : (
              <span className="text-shortcut-navy-blue font-extrabold text-2xl">${totalCost.toFixed(2)}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LocationSummary;

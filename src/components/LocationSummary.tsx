import React from 'react';
import { format } from 'date-fns';

interface LocationSummaryProps {
  location: string;
  services: any;
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

const LocationSummary: React.FC<LocationSummaryProps> = ({ location, services }) => {
  const dates = Object.keys(services).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
  
  const totalAppointments = Object.values(services).reduce((sum: number, dateData: any) => 
    sum + dateData.totalAppointments, 0
  );
  
  const totalCost = Object.values(services).reduce((sum: number, dateData: any) => 
    sum + dateData.totalCost, 0
  );

  const uniqueServices = new Set();
  Object.values(services).forEach((dateData: any) => {
    dateData.services.forEach((service: any) => {
      uniqueServices.add(service.serviceType);
    });
  });

  return (
    <div className="card-large bg-shortcut-teal">
      <h3 className="text-xl font-extrabold mb-6 text-shortcut-navy-blue">{location} Summary</h3>
      <div className="space-y-5">
        <div className="flex justify-between items-center py-3 border-b-2 border-shortcut-navy-blue border-opacity-20">
          <span className="font-bold text-shortcut-navy-blue text-base">Date(s):</span>
          <span className="text-shortcut-navy-blue font-semibold text-base">
            {dates.map(date => formatDate(date)).join(', ')}
          </span>
        </div>
        <div className="flex justify-between items-center py-3 border-b-2 border-shortcut-navy-blue border-opacity-20">
          <span className="font-bold text-shortcut-navy-blue text-base">Service(s):</span>
          <span className="text-shortcut-navy-blue font-semibold text-base text-right">
            {Array.from(uniqueServices).join(', ')}
          </span>
        </div>
        <div className="flex justify-between items-center py-3 border-b-2 border-shortcut-navy-blue border-opacity-20">
          <span className="font-bold text-shortcut-navy-blue text-base">Appointments:</span>
          <span className="text-shortcut-navy-blue font-semibold text-base">{totalAppointments}</span>
        </div>
        <div className="flex justify-between items-center py-3">
          <span className="font-bold text-shortcut-navy-blue text-base">Total Cost:</span>
          <span className="text-shortcut-navy-blue font-semibold text-base">${totalCost.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default LocationSummary;
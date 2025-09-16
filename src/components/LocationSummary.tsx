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
    <div className="bg-[#9EFAFF] rounded-2xl shadow-lg p-8">
      <h3 className="text-2xl font-bold text-shortcut-blue mb-6">{location} Summary</h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center py-2 border-b border-shortcut-blue/20">
          <span className="text-shortcut-blue">Date(s):</span>
          <span className="text-shortcut-blue font-semibold">
            {dates.map(date => formatDate(date)).join(', ')}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-shortcut-blue/20">
          <span className="text-shortcut-blue">Service(s):</span>
          <span className="text-shortcut-blue font-semibold text-right">
            {Array.from(uniqueServices).join(', ')}
          </span>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-shortcut-blue/20">
          <span className="text-shortcut-blue">Appointments:</span>
          <span className="text-shortcut-blue font-semibold">{totalAppointments}</span>
        </div>
        <div className="flex justify-between items-center py-2">
          <span className="text-shortcut-blue">Total Cost:</span>
          <span className="text-shortcut-blue font-semibold">${totalCost.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default LocationSummary;
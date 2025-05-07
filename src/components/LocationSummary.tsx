import React from 'react';
import { format } from 'date-fns';

interface LocationSummaryProps {
  location: string;
  services: any;
}

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
            {dates.map(date => format(new Date(date), 'MMM d, yyyy')).join(', ')}
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
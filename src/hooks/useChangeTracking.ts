import { useState, useEffect } from 'react';

interface Change {
  original: number;
  current: number;
  type: 'pros' | 'hours' | 'cost';
  location: string;
  date: string;
  serviceIndex: number;
  timestamp: string;
}

export const useChangeTracking = (originalData: any, currentData: any) => {
  const [changes, setChanges] = useState<Change[]>([]);

  useEffect(() => {
    if (!originalData || !currentData) return;

    const newChanges: Change[] = [];
    const timestamp = new Date().toISOString();

    Object.entries(currentData.services || {}).forEach(([location, locationData]: [string, any]) => {
      Object.entries(locationData).forEach(([date, dateData]: [string, any]) => {
        dateData.services.forEach((service: any, index: number) => {
          const originalService = originalData.services?.[location]?.[date]?.services?.[index];
          if (!originalService) return;

          // Track professional changes
          if (service.numPros !== originalService.numPros) {
            newChanges.push({
              original: originalService.numPros,
              current: service.numPros,
              type: 'pros',
              location,
              date,
              serviceIndex: index,
              timestamp
            });
          }

          // Track hours changes
          if (service.totalHours !== originalService.totalHours) {
            newChanges.push({
              original: originalService.totalHours,
              current: service.totalHours,
              type: 'hours',
              location,
              date,
              serviceIndex: index,
              timestamp
            });
          }

          // Track cost changes
          if (service.serviceCost !== originalService.serviceCost) {
            newChanges.push({
              original: originalService.serviceCost,
              current: service.serviceCost,
              type: 'cost',
              location,
              date,
              serviceIndex: index,
              timestamp
            });
          }
        });
      });
    });

    setChanges(newChanges);
  }, [originalData, currentData]);

  return changes;
};
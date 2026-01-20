import { RosieData } from './types';

const STORAGE_KEY = 'rosie_data';

export const getStoredData = (): RosieData | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as RosieData;
  } catch (error) {
    console.error('Error reading Rosie data from localStorage:', error);
    return null;
  }
};

export const saveData = (data: RosieData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error saving Rosie data to localStorage:', error);
  }
};

export const clearData = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing Rosie data from localStorage:', error);
  }
};

export const exportData = (): string => {
  const data = getStoredData();
  return JSON.stringify(data, null, 2);
};

export const importData = (jsonString: string): boolean => {
  try {
    const data = JSON.parse(jsonString) as RosieData;
    if (!data.baby || !data.timeline) {
      throw new Error('Invalid data structure');
    }
    saveData(data);
    return true;
  } catch (error) {
    console.error('Error importing Rosie data:', error);
    return false;
  }
};

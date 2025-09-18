import React, { useState } from 'react';
import { X, Calendar, Users } from 'lucide-react';
import { Button } from './Button';
import { HeadshotEvent } from '../types/headshot';

interface HeadshotEventModalProps {
  onClose: () => void;
  onSubmit: (eventData: Omit<HeadshotEvent, 'id' | 'created_at' | 'updated_at'>) => void;
}

export const HeadshotEventModal: React.FC<HeadshotEventModalProps> = ({
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    event_name: '',
    event_date: '',
    total_employees: 0,
    status: 'draft' as HeadshotEvent['status']
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.event_name.trim()) {
      newErrors.event_name = 'Event name is required';
    }

    if (!formData.event_date) {
      newErrors.event_date = 'Event date is required';
    } else {
      const eventDate = new Date(formData.event_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (eventDate < today) {
        newErrors.event_date = 'Event date cannot be in the past';
      }
    }

    if (formData.total_employees < 0) {
      newErrors.total_employees = 'Total employees cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSubmit({
      ...formData,
      event_date: formData.event_date,
      total_employees: formData.total_employees || 0
    });
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Create Headshot Event</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Event Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Name *
            </label>
            <input
              type="text"
              value={formData.event_name}
              onChange={(e) => handleInputChange('event_name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-shortcut-blue focus:border-shortcut-blue ${
                errors.event_name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Q4 2024 Headshots"
            />
            {errors.event_name && (
              <p className="mt-1 text-sm text-red-600">{errors.event_name}</p>
            )}
          </div>

          {/* Event Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Event Date *
            </label>
            <div className="relative">
              <input
                type="date"
                value={formData.event_date}
                onChange={(e) => handleInputChange('event_date', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-shortcut-blue focus:border-shortcut-blue ${
                  errors.event_date ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              <Calendar className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {errors.event_date && (
              <p className="mt-1 text-sm text-red-600">{errors.event_date}</p>
            )}
          </div>

          {/* Total Employees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expected Number of Employees
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={formData.total_employees}
                onChange={(e) => handleInputChange('total_employees', parseInt(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-shortcut-blue focus:border-shortcut-blue ${
                  errors.total_employees ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0"
              />
              <Users className="absolute right-3 top-2.5 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            {errors.total_employees && (
              <p className="mt-1 text-sm text-red-600">{errors.total_employees}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              This is just an estimate. You can import the actual employee list later.
            </p>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value as HeadshotEvent['status'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-shortcut-blue focus:border-shortcut-blue"
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
            >
              Create Event
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface EditableFieldProps {
  value: string | number;
  onChange: (value: string | number) => void;
  isEditing: boolean;
  type?: 'text' | 'number' | 'date';
  prefix?: string;
  suffix?: string;
  multiline?: boolean;
  className?: string;
  originalValue?: string | number;
  showChange?: boolean;
}

const EditableField: React.FC<EditableFieldProps> = ({
  value,
  onChange,
  isEditing,
  type = 'text',
  prefix,
  suffix,
  multiline = false,
  className = '',
  originalValue,
  showChange = false
}) => {
  const [fieldValue, setFieldValue] = useState(value);
  
  useEffect(() => {
    setFieldValue(value);
  }, [value]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setFieldValue(newValue);
    onChange(type === 'number' ? Number(newValue) : newValue);
  };

  const formatValue = (val: string | number): string => {
    if (type === 'number' && typeof val === 'number') {
      return val.toFixed(2);
    }
    if (type === 'date' && typeof val === 'string') {
      try {
        const date = new Date(val);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString();
        }
      } catch (err) {
        console.error('Error formatting date:', err);
      }
    }
    return String(val);
  };

  const renderChangeIndicator = () => {
    if (!showChange || originalValue === undefined || originalValue === value) return null;

    const diff = Number(value) - Number(originalValue);
    const percentChange = ((Number(value) - Number(originalValue)) / Number(originalValue)) * 100;
    const isIncrease = diff > 0;
    const Icon = isIncrease ? TrendingUp : TrendingDown;

    return (
      <div className={`inline-flex items-center gap-1 ml-2 text-sm ${isIncrease ? 'text-green-500' : 'text-red-500'}`}>
        <Icon className="w-4 h-4" />
        <span>
          {isIncrease ? '+' : ''}
          {percentChange.toFixed(1)}%
        </span>
      </div>
    );
  };
  
  if (!isEditing) {
    return (
      <div className={`flex items-center justify-end ${className}`}>
        <span className="whitespace-nowrap">
          {prefix}{formatValue(value)}{suffix}
        </span>
        {renderChangeIndicator()}
      </div>
    );
  }
  
  if (multiline) {
    return (
      <textarea
        value={fieldValue}
        onChange={handleChange}
        className={`w-full min-h-[100px] px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal ${className}`}
        rows={3}
      />
    );
  }

  if (type === 'date') {
    return (
      <input
        type="date"
        value={typeof fieldValue === 'string' ? fieldValue : ''}
        onChange={handleChange}
        className={`w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal ${className}`}
      />
    );
  }
  
  return (
    <div className="flex items-center">
      {prefix && <span className="mr-1 text-sm font-medium text-gray-500 shrink-0">{prefix}</span>}
      <input
        type={type}
        value={typeof fieldValue === 'number' ? String(fieldValue) : fieldValue}
        onChange={handleChange}
        className={`w-full px-3 py-2 text-right border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal ${className}`}
        min={type === 'number' ? 0 : undefined}
        step={type === 'number' ? 'any' : undefined}
      />
      {suffix && <span className="ml-1 text-sm font-medium text-gray-500 shrink-0">{suffix}</span>}
      {renderChangeIndicator()}
    </div>
  );
};

export default EditableField;
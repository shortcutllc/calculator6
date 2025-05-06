import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface EditableFieldProps {
  value: string | number;
  onChange: (value: string | number) => void;
  isEditing: boolean;
  type?: 'text' | 'number';
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
  };
  
  const handleBlur = () => {
    onChange(type === 'number' ? Number(fieldValue) : fieldValue);
  };

  const formatValue = (val: string | number): string => {
    if (type === 'number' && typeof val === 'number') {
      return val.toFixed(2);
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
          {prefix}{formatValue(value)}
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
        onBlur={handleBlur}
        className={`w-full min-h-[100px] px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:border-transparent ${className}`}
        rows={3}
      />
    );
  }
  
  return (
    <div className="flex items-center justify-end">
      {prefix && <span className="mr-1">{prefix}</span>}
      <input
        type={type}
        value={fieldValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={`w-32 px-4 py-2 text-right border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-shortcut-blue focus:border-transparent ${className}`}
        min={type === 'number' ? 0 : undefined}
        step={type === 'number' ? 'any' : undefined}
      />
      {renderChangeIndicator()}
    </div>
  );
};

export default EditableField;
import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from './Button';
import { CSVEmployeeData } from '../types/headshot';
import { CSVParticipantData } from '../types/mindfulnessProgram';
import { HeadshotService } from '../services/HeadshotService';
import { MindfulnessProgramService } from '../services/MindfulnessProgramService';

type CSVData = CSVEmployeeData | CSVParticipantData;

interface CSVUploaderProps {
  onClose: () => void;
  onUpload: (data: CSVData[]) => void;
  type?: 'headshot' | 'mindfulness';
  label?: string; // e.g., "Employees" or "Participants"
}

export const CSVUploader: React.FC<CSVUploaderProps> = ({
  onClose,
  onUpload,
  type = 'headshot',
  label
}) => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState<string>('');
  const [parsedData, setParsedData] = useState<CSVData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const itemLabel = label || (type === 'mindfulness' ? 'participants' : 'employees');
  const ItemLabel = itemLabel.charAt(0).toUpperCase() + itemLabel.slice(1);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setCsvFile(file);
    setError('');

    // Read file content
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setCsvContent(content);
      
      try {
        const parsed = type === 'mindfulness' 
          ? MindfulnessProgramService.parseCSV(content)
          : HeadshotService.parseCSV(content);
        setParsedData(parsed);
        if (parsed.length === 0) {
          setError(`No valid ${itemLabel} data found in CSV`);
        }
      } catch (err) {
        setError('Failed to parse CSV file');
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.name.toLowerCase().endsWith('.csv')) {
      setCsvFile(file);
      setError('');
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setCsvContent(content);
        
        try {
          const parsed = type === 'mindfulness'
            ? MindfulnessProgramService.parseCSV(content)
            : HeadshotService.parseCSV(content);
          setParsedData(parsed);
          if (parsed.length === 0) {
            setError(`No valid ${itemLabel} data found in CSV`);
          }
        } catch (err) {
          setError('Failed to parse CSV file');
        }
      };
      reader.readAsText(file);
    } else {
      setError('Please drop a CSV file');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleUpload = async () => {
    if (parsedData.length === 0) {
      setError(`No ${itemLabel} to upload`);
      return;
    }

    setLoading(true);
    try {
      await onUpload(parsedData);
    } catch (err) {
      setError(`Failed to upload ${itemLabel}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = 'name,email,phone\nJohn Doe,john.doe@company.com,555-0123\nJane Smith,jane.smith@company.com,555-0124';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${itemLabel}_template.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Import {ItemLabel} from CSV</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">CSV Format Requirements</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• First row should contain headers: name, email, phone</li>
              <li>• Each row represents one {itemLabel.slice(0, -1)}</li>
              <li>• Name and email are required, phone is optional</li>
              <li>• Use commas to separate values</li>
            </ul>
            <button
              onClick={downloadTemplate}
              className="mt-3 text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Download CSV template
            </button>
          </div>

          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              csvFile
                ? 'border-green-300 bg-green-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            {csvFile ? (
              <div className="space-y-4">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-gray-900">{csvFile.name}</p>
                  <p className="text-sm text-gray-600">
                    {parsedData.length} {itemLabel} found
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setCsvFile(null);
                    setCsvContent('');
                    setParsedData([]);
                    setError('');
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  Choose Different File
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    Drop your CSV file here, or click to browse
                  </p>
                  <p className="text-sm text-gray-600">
                    Supports CSV files with {itemLabel} data
                  </p>
                </div>
                <Button
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Choose File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Preview */}
          {parsedEmployees.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Preview ({parsedData.length} {itemLabel})</span>
              </h3>

              <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                <div className="space-y-2">
                  {parsedData.slice(0, 10).map((item, index) => (
                    <div key={index} className="flex items-center space-x-4 text-sm">
                      <div className="w-8 h-8 bg-shortcut-blue text-white rounded-full flex items-center justify-center text-xs font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-gray-600">{item.email}</div>
                        {item.phone && (
                          <div className="text-gray-500">{item.phone}</div>
                        )}
                      </div>
                    </div>
                  ))}
                  {parsedData.length > 10 && (
                    <div className="text-sm text-gray-500 text-center py-2">
                      ... and {parsedData.length - 10} more {itemLabel}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={parsedData.length === 0 || loading}
              className="flex-1"
            >
              {loading ? 'Uploading...' : `Upload ${parsedData.length} ${ItemLabel}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

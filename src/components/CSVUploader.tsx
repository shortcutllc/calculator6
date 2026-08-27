import React, { useState, useRef } from 'react';
import { Upload, FileText, Users, AlertCircle, CheckCircle } from 'lucide-react';
import { Modal, Card, CoralButton, OutlineButton, SOFT, LINE } from './headshot/brand';
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
  const [parsedData, setParsedData] = useState<CSVData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const itemLabel = label || (type === 'mindfulness' ? 'participants' : 'employees');

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
    <Modal
      onClose={onClose}
      title={`Import ${itemLabel} from a CSV`}
      sub={`One row per ${itemLabel.slice(0, -1)}, with a name and an email.`}
      wide
    >
      <div className="space-y-6">
        {/* What the file needs */}
        <div className="rounded-[14px] bg-[#F1F6F5] p-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[.09em] text-[#45596A]">
            What the file needs
          </p>
          <ul className={`space-y-1.5 text-[14px] ${SOFT}`}>
            <li className="flex gap-2.5">
              <span className="mt-[9px] h-1.5 w-1.5 flex-none rounded-full bg-[#FF5050]" />
              A header row with name, email and phone
            </li>
            <li className="flex gap-2.5">
              <span className="mt-[9px] h-1.5 w-1.5 flex-none rounded-full bg-[#FF5050]" />
              Name and email are required, phone is optional
            </li>
            <li className="flex gap-2.5">
              <span className="mt-[9px] h-1.5 w-1.5 flex-none rounded-full bg-[#FF5050]" />
              Exports from Excel or Google Sheets work as they are
            </li>
          </ul>
          <button
            onClick={downloadTemplate}
            className="mt-3.5 text-[13.5px] font-bold text-[#003756] underline underline-offset-2 hover:opacity-70"
          >
            Download a template
          </button>
        </div>

        {/* Drop zone */}
        <div
          className={`rounded-[18px] border-2 border-dashed p-8 text-center transition-colors ${
            csvFile ? 'border-[#FF5050] bg-[#FF5050]/[.04]' : `${LINE} hover:border-[#003756]`
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {csvFile ? (
            <div className="space-y-4">
              <CheckCircle className="mx-auto h-10 w-10 text-[#003756]" />
              <div>
                <p className="text-[16px] font-bold text-[#003756]">{csvFile.name}</p>
                <p className={`text-[14px] ${SOFT}`}>
                  {parsedData.length} {itemLabel} found
                </p>
              </div>
              <OutlineButton
                onClick={() => {
                  setCsvFile(null);
                  setParsedData([]);
                  setError('');
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              >
                Choose a different file
              </OutlineButton>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="mx-auto h-10 w-10 text-[#45596A]" />
              <div>
                <p className="text-[16px] font-bold text-[#003756]">Drop your CSV here</p>
                <p className={`text-[14px] ${SOFT}`}>or pick it from your computer</p>
              </div>
              <OutlineButton onClick={() => fileInputRef.current?.click()}>
                <FileText className="h-4 w-4" />
                Choose file
              </OutlineButton>
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

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-[14px] border-2 border-[#FF5050] bg-white px-5 py-4">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-none text-[#FF5050]" />
            <p className="text-[14px] text-[#032232]">{error}</p>
          </div>
        )}

        {/* Preview */}
        {parsedData.length > 0 && (
          <div>
            <h3 className="mb-3 flex items-center gap-2 text-[15px] font-extrabold text-[#003756]">
              <Users className="h-4 w-4" />
              Check these look right ({parsedData.length})
            </h3>
            <Card tone="mist" className="max-h-64 overflow-y-auto p-5">
              <div className="space-y-3">
                {parsedData.slice(0, 10).map((item, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="grid h-8 w-8 flex-none place-items-center rounded-full bg-[#003756] text-[11px] font-extrabold text-[#9EFAFF]">
                      {index + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14.5px] font-bold text-[#003756]">{item.name}</div>
                      <div className={`text-[13.5px] ${SOFT}`}>
                        {item.email}
                        {item.phone ? ` · ${item.phone}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
                {parsedData.length > 10 && (
                  <p className={`pt-1 text-center text-[13.5px] ${SOFT}`}>
                    and {parsedData.length - 10} more
                  </p>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* Actions */}
        <div className={`flex gap-3 border-t ${LINE} pt-5`}>
          <OutlineButton type="button" onClick={onClose} className="flex-1 justify-center">
            Cancel
          </OutlineButton>
          <CoralButton
            onClick={handleUpload}
            disabled={parsedData.length === 0 || loading}
            className="flex-1 justify-center"
          >
            {loading ? 'Importing...' : `Import ${parsedData.length} ${itemLabel}`}
          </CoralButton>
        </div>
      </div>
    </Modal>
  );
};

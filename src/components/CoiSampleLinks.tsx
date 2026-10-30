import React from 'react';
import { FileText } from 'lucide-react';
import { openCoiSample, type CoiSampleFile } from '../services/coiSampleService';

// Staff: the sample COIs a client uploaded with the event survey, each one
// opening through a short-lived signed link (the bucket is private).

const CoiSampleLinks: React.FC<{ files?: CoiSampleFile[] | null; className?: string }> = ({ files, className = '' }) => {
  if (!Array.isArray(files) || files.length === 0) return null;
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {files.map((f) => (
        <button
          key={f.path}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openCoiSample(f.path);
          }}
          className="inline-flex min-w-0 items-center gap-1.5 text-left text-sm font-semibold text-shortcut-blue underline decoration-shortcut-teal decoration-2 underline-offset-2"
        >
          <FileText size={14} className="flex-shrink-0" />
          <span className="truncate">Sample COI: {f.name}</span>
        </button>
      ))}
    </div>
  );
};

export default CoiSampleLinks;

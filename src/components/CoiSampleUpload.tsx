import React, { useRef, useState } from 'react';
import { FileText, Loader2, Upload, X } from 'lucide-react';
import { uploadCoiSample, COI_ACCEPT, type CoiSampleFile } from '../services/coiSampleService';

// The optional "sample COI from your building" upload under the survey's COI
// question (ProposalSurveyForm). Files upload as soon as they are picked; the
// survey saves the list when it is submitted.

interface Props {
  proposalId: string;
  files: CoiSampleFile[];
  onChange: (files: CoiSampleFile[]) => void;
  /** True while a file is uploading, so the form can hold its submit. */
  onBusyChange?: (busy: boolean) => void;
}

const MAX_FILES = 3;

const CoiSampleUpload: React.FC<Props> = ({ proposalId, files, onChange, onBusyChange }) => {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const pick = async (file?: File) => {
    if (!file) return;
    setError('');
    setUploading(true);
    onBusyChange?.(true);
    try {
      const saved = await uploadCoiSample(proposalId, file);
      onChange([...files, saved]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The upload did not finish. Please try again.');
    } finally {
      setUploading(false);
      onBusyChange?.(false);
    }
  };

  return (
    <div className="mt-4 rounded-md border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm font-semibold text-gray-700">Sample COI from your building (optional)</p>
      <p className="mt-1 text-sm text-gray-600">
        If your building or landlord gave you a sample certificate or a list of insurance requirements, upload it here
        and we'll make sure ours matches.
      </p>

      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((f) => (
            <li key={f.path} className="flex items-center justify-between gap-3 rounded border border-gray-200 bg-white px-3 py-2">
              <span className="flex min-w-0 items-center gap-2 text-sm text-gray-800">
                <FileText size={16} className="flex-shrink-0 text-shortcut-blue" />
                <span className="truncate">{f.name}</span>
              </span>
              <button
                type="button"
                onClick={() => onChange(files.filter((x) => x.path !== f.path))}
                className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-red-600"
                aria-label={`Remove ${f.name}`}
              >
                <X size={14} /> Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {files.length < MAX_FILES && (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={uploading}
          className="mt-3 inline-flex items-center gap-2 rounded-md border border-shortcut-blue px-3 py-2 text-sm font-semibold text-shortcut-blue hover:bg-shortcut-blue/5 disabled:opacity-60"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? 'Uploading…' : files.length ? 'Upload another file' : 'Upload a file'}
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept={COI_ACCEPT}
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <p className="mt-2 text-xs text-gray-500">PDF, Word or an image, up to 10 MB.</p>
      {error && <p className="mt-2 text-sm font-medium text-red-700">{error}</p>}
    </div>
  );
};

export default CoiSampleUpload;

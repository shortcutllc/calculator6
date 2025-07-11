import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { FileText, Trash2, Share2, Copy, CheckCircle2, Upload } from 'lucide-react';
import { Button } from './Button';
import { format } from 'date-fns';
import { config } from '../config';

interface Brochure {
  id: string;
  name: string;
  created_at: string;
  url: string;
  shareUrl: string;
}

const BrochureList: React.FC = () => {
  const [brochures, setBrochures] = useState<Brochure[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBrochures();
  }, []);

  const fetchBrochures = async () => {
    try {
      setLoading(true);
      const { data: files, error } = await supabase.storage
        .from('brochures')
        .list();

      if (error) throw error;

      const brochureData = files.map(file => {
        const name = file.name.replace('.pdf', '');
        return {
          id: file.id,
          name: file.name,
          created_at: file.created_at,
          url: supabase.storage.from('brochures').getPublicUrl(file.name).data.publicUrl,
          shareUrl: `${config.app.baseUrl}/brochures/${name}?shared=true`
        };
      });

      setBrochures(brochureData);
    } catch (err) {
      console.error('Error fetching brochures:', err);
      setError('Failed to load brochures');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (name: string) => {
    if (!confirm('Are you sure you want to delete this brochure?')) return;

    try {
      const { error } = await supabase.storage
        .from('brochures')
        .remove([name]);

      if (error) throw error;

      await fetchBrochures();
    } catch (err) {
      console.error('Error deleting brochure:', err);
      setError('Failed to delete brochure');
    }
  };

  const handleUpdate = async (name: string, file: File) => {
    try {
      setUpdating(name);

      if (file.type !== 'application/pdf') {
        throw new Error('Please upload a PDF file');
      }

      if (file.size > 50 * 1024 * 1024) {
        throw new Error('File size must be less than 50MB');
      }

      const { error: uploadError } = await supabase.storage
        .from('brochures')
        .update(name, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      await fetchBrochures();
    } catch (err) {
      console.error('Error updating brochure:', err);
      setError(err instanceof Error ? err.message : 'Failed to update brochure');
    } finally {
      setUpdating(null);
    }
  };

  const copyToClipboard = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setError('Failed to copy link to clipboard');
    }
  };

  const triggerFileInput = (name: string) => {
    if (fileInputRef.current) {
      fileInputRef.current.dataset.brochureName = name;
      fileInputRef.current.click();
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    const brochureName = event.target.dataset.brochureName;
    
    if (!file || !brochureName) return;
    handleUpdate(brochureName, file);
  };

  if (loading) {
    return <div className="text-center py-8">Loading brochures...</div>;
  }

  if (error) {
    return <div className="text-red-600 text-center py-8">{error}</div>;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="application/pdf"
        className="hidden"
      />

      {brochures.length === 0 ? (
        <div className="text-center py-8 sm:py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900">No brochures found</h3>
          <p className="mt-2 text-sm text-gray-500">Upload a brochure to get started</p>
        </div>
      ) : (
        brochures.map((brochure) => (
          <div key={brochure.id} className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {brochure.name.replace('.pdf', '')}
                </h3>
                <p className="text-sm text-gray-500">
                  Uploaded {format(new Date(brochure.created_at), 'MMM d, yyyy h:mm a')}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => copyToClipboard(brochure.shareUrl, brochure.id)}
                  variant="secondary"
                  icon={copiedId === brochure.id ? <CheckCircle2 size={18} /> : <Share2 size={18} />}
                  className="flex-1 sm:flex-none"
                >
                  {copiedId === brochure.id ? 'Copied!' : 'Share'}
                </Button>
                <Button
                  onClick={() => triggerFileInput(brochure.name)}
                  variant="secondary"
                  icon={<Upload size={18} />}
                  loading={updating === brochure.name}
                  className="flex-1 sm:flex-none"
                >
                  {updating === brochure.name ? 'Updating...' : 'Update'}
                </Button>
                <Button
                  onClick={() => handleDelete(brochure.name)}
                  variant="secondary"
                  icon={<Trash2 size={18} />}
                  className="flex-1 sm:flex-none"
                >
                  Delete
                </Button>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-600 truncate">
                  Share Link: <span className="font-mono text-xs break-all">{brochure.shareUrl}</span>
                </p>
                <button
                  onClick={() => copyToClipboard(brochure.shareUrl, `${brochure.id}-link`)}
                  className="p-1 text-gray-500 hover:text-gray-700 flex-shrink-0"
                  title={copiedId === `${brochure.id}-link` ? 'Copied!' : 'Copy Link'}
                >
                  {copiedId === `${brochure.id}-link` ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default BrochureList;
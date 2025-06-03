import React, { useState, useEffect } from 'react';
import { FileText, Upload, ArrowLeft, X, Calculator } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { Button } from './Button';
import BrochureList from './BrochureList';

const BrochurePage: React.FC = () => {
  const { user } = useAuth();
  const [uploadLoading, setUploadLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [brochureName, setBrochureName] = useState<string>('');
  const [showNameInput, setShowNameInput] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      setError('File size must be less than 50MB');
      return;
    }

    setSelectedFile(file);
    setShowNameInput(true);
    setError(null);
  };

  const handleUpload = async () => {
    if (!selectedFile || !brochureName.trim()) return;

    try {
      setUploadLoading(true);
      setError(null);
      
      // Create URL-friendly name
      const safeName = brochureName.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      const filename = `${safeName}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('brochures')
        .upload(filename, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        if (uploadError.message.includes('already exists')) {
          setError('A brochure with this name already exists');
          return;
        }
        throw uploadError;
      }

      // Reset form
      setBrochureName('');
      setSelectedFile(null);
      setShowNameInput(false);

      // Reload the brochure list
      window.location.reload();
    } catch (err) {
      setError('Failed to upload file. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setUploadLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm py-4 px-4 sm:px-6 lg:px-8 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <a 
              href="/" 
              className="flex items-center gap-2 text-shortcut-blue hover:opacity-80 transition-opacity"
            >
              <ArrowLeft size={20} />
              <span className="hidden sm:inline">Back to Dashboard</span>
            </a>
          </div>
          <img 
            src="/shortcut-logo blue.svg" 
            alt="Shortcut Logo" 
            className="h-6 sm:h-8 w-auto"
          />
        </div>
      </header>

      <main className="max-w-6xl mx-auto py-4 sm:py-8 px-4 sm:px-6 lg:px-8">
        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-shortcut-blue">Brochures</h1>
              <p className="text-sm text-gray-600 mt-1">Upload and manage your brochures (max 50MB)</p>
            </div>
            {!showNameInput && (
              <div className="relative w-full sm:w-auto">
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploadLoading}
                />
                <Button
                  variant="primary"
                  icon={<Upload size={18} />}
                  loading={uploadLoading}
                  className="w-full sm:w-auto"
                >
                  Upload New Brochure
                </Button>
              </div>
            )}
          </div>

          {showNameInput && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Brochure Name
              </label>
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  value={brochureName}
                  onChange={(e) => setBrochureName(e.target.value)}
                  placeholder="Enter brochure name"
                  className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-blue"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleUpload}
                    variant="primary"
                    loading={uploadLoading}
                    disabled={!brochureName.trim()}
                    className="flex-1 sm:flex-none"
                  >
                    Upload
                  </Button>
                  <Button
                    onClick={() => {
                      setShowNameInput(false);
                      setSelectedFile(null);
                      setBrochureName('');
                    }}
                    variant="secondary"
                    className="flex-1 sm:flex-none"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                This name will be used in the share link: proposals.getshortcut.co/brochures/[name]
              </p>
            </div>
          )}

          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-600 p-4 rounded-lg">
              {error}
            </div>
          )}
        </div>

        {/* Brochure List */}
        <BrochureList />
      </main>
    </div>
  );
};

export default BrochurePage;
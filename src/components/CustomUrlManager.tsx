import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Copy, CheckCircle, ExternalLink, Link } from 'lucide-react';
import { CustomUrlService, CustomUrlData } from '../services/CustomUrlService';
import { Button } from './Button';

interface CustomUrlManagerProps {
  originalId: string;
  type: CustomUrlData['type'];
  clientName: string;
  currentName?: string; // For display purposes (employee name, event name, etc.)
  onUrlChange?: (customUrl: string | null) => void;
}

export const CustomUrlManager: React.FC<CustomUrlManagerProps> = ({
  originalId,
  type,
  clientName,
  currentName,
  onUrlChange
}) => {
  const [customUrl, setCustomUrl] = useState<CustomUrlData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [autoGenerating, setAutoGenerating] = useState(false);

  useEffect(() => {
    fetchCustomUrl();
  }, [originalId, type]);

  const fetchCustomUrl = async () => {
    try {
      const url = await CustomUrlService.getByOriginalId(originalId, type);
      setCustomUrl(url);
      
      // If no custom URL exists, auto-generate one
      if (!url) {
        await autoGenerateUrl();
      }
    } catch (err) {
      console.error('Error fetching custom URL:', err);
    }
  };

  const autoGenerateUrl = async () => {
    if (!currentName) return;

    setAutoGenerating(true);
    setError(null);

    try {
      const data: any = {
        clientName,
        eventName: currentName
      };

      // Add specific data based on type
      if (type === 'employee_gallery' || type === 'photographer_token') {
        data.employeeName = currentName;
        data.photographerName = currentName;
      }

      const newCustomUrl = await CustomUrlService.autoGenerateCustomUrl(
        originalId,
        type,
        data
      );
      
      setCustomUrl(newCustomUrl);
      onUrlChange?.(CustomUrlService.generateCustomUrl(clientName, newCustomUrl.custom_slug, type));
    } catch (err: any) {
      setError(err.message || 'Failed to generate custom URL');
    } finally {
      setAutoGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    await autoGenerateUrl();
  };

  const handleCopy = async () => {
    if (!customUrl) return;

    const url = CustomUrlService.generateCustomUrl(clientName, customUrl.custom_slug, type);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'proposal': return 'Proposal';
      case 'headshot_event': return 'Headshot Event';
      case 'employee_gallery': return 'Employee Gallery';
      case 'photographer_token': return 'Photographer Portal';
      default: return 'Item';
    }
  };

  const getTypeIcon = () => {
    switch (type) {
      case 'proposal': return <ExternalLink className="w-4 h-4" />;
      case 'headshot_event': return <Link className="w-4 h-4" />;
      case 'employee_gallery': return <ExternalLink className="w-4 h-4" />;
      case 'photographer_token': return <ExternalLink className="w-4 h-4" />;
      default: return <Link className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {getTypeIcon()}
          <h3 className="text-lg font-medium text-gray-900">
            Auto-Generated {getTypeLabel()} URL
          </h3>
        </div>
        <Button
          onClick={handleRegenerate}
          disabled={autoGenerating}
          variant="secondary"
          className="flex items-center space-x-2"
        >
          {autoGenerating ? (
            <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <Edit className="w-4 h-4" />
          )}
          <span>{autoGenerating ? 'Generating...' : 'Regenerate'}</span>
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {customUrl ? (
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-sm font-medium text-gray-700">Custom URL:</span>
              <button
                onClick={handleCopy}
                className="text-blue-600 hover:text-blue-800"
                title="Copy URL"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <div className="p-3 bg-gray-50 rounded-md">
              <code className="text-sm text-gray-800 break-all">
                {window.location.origin}/{clientName}/{type}/{customUrl.custom_slug}
              </code>
            </div>
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-800">
                <strong>Auto-generated based on:</strong> {
                  type === 'proposal' || type === 'headshot_event' ? 'Client name' :
                  type === 'employee_gallery' ? 'Employee first name + last initial' :
                  type === 'photographer_token' ? 'Photographer first name + last initial' :
                  'Available data'
                }
              </p>
            </div>
          </div>
        ) : autoGenerating ? (
          <div className="text-center py-6">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-600">Generating custom URL...</p>
          </div>
        ) : (
          <div className="text-center py-6">
            <Link className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 mb-4">No custom URL available</p>
            <p className="text-sm text-gray-500">
              Custom URLs are automatically generated based on logical parameters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

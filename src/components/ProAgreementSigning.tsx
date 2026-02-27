import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { DocusealForm } from '@docuseal/react';
import { CheckCircle } from 'lucide-react';

const ProAgreementSigning: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const [completed, setCompleted] = useState(false);

  if (!slug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-600">This signing link is not valid. Please check the link you received.</p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Document Signed!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for signing your agreement. A copy has been saved and you can close this page.
          </p>
          <div className="flex items-center justify-center gap-2">
            <img
              src="/shortcut-logo-blue.svg"
              alt="Shortcut Wellness"
              className="h-5 w-auto opacity-50"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <img
            src="/shortcut-logo-blue.svg"
            alt="Shortcut Wellness"
            className="h-6 w-auto"
          />
          <span className="text-sm text-gray-500">Secure Document Signing</span>
        </div>
      </div>

      {/* DocuSeal Embedded Form */}
      <div className="max-w-4xl mx-auto py-8 px-4">
        <DocusealForm
          src={`https://docuseal-production-f0ef.up.railway.app/s/${slug}`}
          onComplete={() => setCompleted(true)}
        />
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-white px-4 py-4 mt-8">
        <div className="max-w-4xl mx-auto text-center text-xs text-gray-400">
          <p>Powered by Shortcut Wellness &middot; Secure document signing via DocuSeal</p>
        </div>
      </div>
    </div>
  );
};

export default ProAgreementSigning;

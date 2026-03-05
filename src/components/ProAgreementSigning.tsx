import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';

const DOCUSEAL_HOST = 'https://docuseal-production-f0ef.up.railway.app';

const ProAgreementSigning: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();

  useEffect(() => {
    if (slug) {
      window.location.href = `${DOCUSEAL_HOST}/s/${slug}`;
    }
  }, [slug]);

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

  // Brief loading state while redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-md mx-auto px-4">
        <img
          src="/shortcut-logo-blue.svg"
          alt="Shortcut Wellness"
          className="h-8 w-auto mx-auto mb-6"
        />
        <p className="text-gray-600 mb-4">Redirecting to your document...</p>
        <a
          href={`${DOCUSEAL_HOST}/s/${slug}`}
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm"
        >
          Click here if not redirected <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
};

export default ProAgreementSigning;

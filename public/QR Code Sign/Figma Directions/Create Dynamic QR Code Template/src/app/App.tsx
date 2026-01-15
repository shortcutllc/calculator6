import { EventSignTemplate } from '@/app/components/EventSignTemplate';
import { massageServiceConfig, wellnessEventConfig, lunchLearnConfig } from '@/app/config/example-configs';
import { useState } from 'react';

export default function App() {
  const [selectedConfig, setSelectedConfig] = useState<'massage' | 'wellness' | 'lunch'>('massage');

  const configs = {
    massage: massageServiceConfig,
    wellness: wellnessEventConfig,
    lunch: lunchLearnConfig,
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Template Selector */}
      <div className="sticky top-0 z-50 bg-white shadow-md p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Event Sign Template Demo</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedConfig('massage')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedConfig === 'massage'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Massage Service
            </button>
            <button
              onClick={() => setSelectedConfig('wellness')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedConfig === 'wellness'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Wellness Event
            </button>
            <button
              onClick={() => setSelectedConfig('lunch')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedConfig === 'lunch'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Lunch & Learn
            </button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-3">
          <p className="text-sm text-gray-600">
            👆 Switch between example templates to see different styles. 
            See <code className="bg-gray-100 px-2 py-1 rounded text-xs">TEMPLATE_INSTRUCTIONS.md</code> for customization guide.
          </p>
        </div>
      </div>

      {/* Template Display */}
      <div className="py-8">
        <EventSignTemplate config={configs[selectedConfig]} />
      </div>

      {/* Instructions Footer */}
      <div className="bg-gray-900 text-white p-8 mt-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">How to Use This Template</h2>
          <div className="space-y-4 text-gray-300">
            <p>
              <strong className="text-white">1. Create your configuration:</strong> Define a <code className="bg-gray-800 px-2 py-1 rounded">TemplateConfig</code> object with your company details, event information, colors, and branding.
            </p>
            <p>
              <strong className="text-white">2. Pass it to the component:</strong> Use <code className="bg-gray-800 px-2 py-1 rounded">&lt;EventSignTemplate config=&#123;yourConfig&#125; /&gt;</code>
            </p>
            <p>
              <strong className="text-white">3. Customize everything:</strong> Every element is configurable - logos, colors, text, images, QR codes, and more.
            </p>
            <p className="mt-6">
              📖 <strong className="text-white">Full documentation:</strong> See <code className="bg-gray-800 px-2 py-1 rounded">/TEMPLATE_INSTRUCTIONS.md</code> for complete configuration options and examples.
            </p>
            <p>
              💾 <strong className="text-white">Example configs:</strong> Check <code className="bg-gray-800 px-2 py-1 rounded">/src/app/config/example-configs.ts</code> for ready-to-use configurations.
            </p>
            <p>
              🎨 <strong className="text-white">Type definitions:</strong> See <code className="bg-gray-800 px-2 py-1 rounded">/src/app/types/template-config.ts</code> for all available options.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

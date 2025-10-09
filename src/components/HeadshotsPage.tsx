import React, { useState } from 'react';
import { HeadshotEventManager } from './HeadshotEventManager';
import { PhotographerManager } from './PhotographerManager';
import { Calendar, Users } from 'lucide-react';

export const HeadshotsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'events' | 'photographers'>('events');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('events')}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === 'events'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Headshot Events</span>
              </button>
                <button
                  onClick={() => setActiveTab('photographers')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === 'photographers'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Photographer Access</span>
                </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'events' && <HeadshotEventManager />}
        {activeTab === 'photographers' && <PhotographerManager />}
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { HeadshotEventManager } from './HeadshotEventManager';
import { PhotographerManager } from './PhotographerManager';
import { Calendar, Users } from 'lucide-react';
import { Page, Kicker, Headline, Sub, Tabs } from './headshot/brand';

export const HeadshotsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'events' | 'photographers'>('events');

  return (
    <Page>
      <div className="pb-8 pt-10 md:pt-12">
        <Kicker>Headshots</Kicker>
        <Headline>Run your headshot events.</Headline>
        <Sub>
          Set up an event, import the roster, and give your photographers a link to upload into.
        </Sub>
      </div>

      <div className="mb-8">
        <Tabs
          active={activeTab}
          onChange={(k) => setActiveTab(k as 'events' | 'photographers')}
          tabs={[
            { key: 'events', label: 'Events', icon: <Calendar className="h-4 w-4" /> },
            { key: 'photographers', label: 'Photographer access', icon: <Users className="h-4 w-4" /> },
          ]}
        />
      </div>

      {activeTab === 'events' && <HeadshotEventManager />}
      {activeTab === 'photographers' && <PhotographerManager />}
    </Page>
  );
};

import React from 'react';
import InstructionCard from './InstructionCard';
import { ChevronRight } from 'lucide-react';

const instructionCards = [
  {
    title: 'Review',
    description: 'Take a peek! Double-check all event details, services, and pricing. Make sure it\'s all looking sharp and just right for you.',
    icon: 'review' as const,
    borderColorClass: 'border-accent-pink'
  },
  {
    title: 'Edit',
    description: 'Need a tweak? Easily adjust service hours or pro numbers. You can also jot down any notes for our team right here.',
    icon: 'edit' as const,
    borderColorClass: 'border-accent-yellow'
  },
  {
    title: 'Confirm',
    description: 'All set? Hit "Save Changes" to lock it in. We\'ll get a heads-up with your updates and finalize everything smoothly.',
    icon: 'confirm' as const,
    borderColorClass: 'border-shortcut-teal'
  }
];

const InstructionalScroller: React.FC = () => {
  return (
    <div className="mb-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">
        How to Use This Proposal
      </h2>
      <div className="relative">
        <div className="flex overflow-x-auto space-x-6 pb-4 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
          {instructionCards.map((card, index) => (
            <InstructionCard
              key={index}
              title={card.title}
              description={card.description}
              icon={card.icon}
              borderColorClass={card.borderColorClass}
            />
          ))}
        </div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-l-lg shadow-md">
          <ChevronRight className="w-6 h-6 text-gray-600 animate-pulse" />
        </div>
      </div>
    </div>
  );
};

export default InstructionalScroller;
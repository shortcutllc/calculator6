import React from 'react';
import { Sparkles, Clock, Users, CheckCircle } from 'lucide-react';

// Why Shortcut Section for Hair & Makeup Proposals
export const HairMakeupWhyShortcutSection: React.FC = () => (
  <div className="card-large bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 border-2 border-shortcut-teal border-opacity-20">
    <h2 className="h2 mb-8 text-shortcut-navy-blue">Why Shortcut?</h2>
    <p className="text-lg font-medium text-text-dark mb-6 leading-relaxed">
      With Shortcut, you can count on:
    </p>
    <div className="space-y-6">
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">Inclusive Styling</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            Our stylists are experienced with all hair types and textures, ensuring everyone looks and feels amazing.
          </p>
        </div>
      </div>
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">Premium Products</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            We use only brand-name, professional-grade styling products for results that last.
          </p>
        </div>
      </div>
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">Clean & Pristine</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            No hair left behind! We leave your space in pristine condition with full sanitation between appointments.
          </p>
        </div>
      </div>
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">Fully Insured</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            All stylists are licensed, insured, and approved for access to any office building.
          </p>
        </div>
      </div>
    </div>
  </div>
);

// Benefits Section for Hair & Makeup Proposals
export const HairMakeupBenefitsSection: React.FC = () => (
  <div className="card-large">
    <h2 className="h2 mb-10">Employee Benefits</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="p-8 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border-2 border-shortcut-teal border-opacity-30 hover:border-opacity-50 hover:shadow-lg transition-all">
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-shortcut-teal bg-opacity-20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-shortcut-blue" />
          </div>
          <h3 className="text-xl font-extrabold text-shortcut-navy-blue">Event-Ready</h3>
        </div>
        <p className="text-lg text-text-dark leading-relaxed font-medium">
          Perfect for headshots, holiday parties, presentations, or any special occasion
        </p>
      </div>
      <div className="p-8 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border-2 border-shortcut-teal border-opacity-30 hover:border-opacity-50 hover:shadow-lg transition-all">
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-shortcut-teal bg-opacity-20 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6 text-shortcut-blue" />
          </div>
          <h3 className="text-xl font-extrabold text-shortcut-navy-blue">Time Savings</h3>
        </div>
        <p className="text-lg text-text-dark leading-relaxed font-medium">
          Professional styling without leaving the office or taking personal time
        </p>
      </div>
      <div className="p-8 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border-2 border-shortcut-teal border-opacity-30 hover:border-opacity-50 hover:shadow-lg transition-all">
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-shortcut-teal bg-opacity-20 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6 text-shortcut-blue" />
          </div>
          <h3 className="text-xl font-extrabold text-shortcut-navy-blue">Inclusive Options</h3>
        </div>
        <p className="text-lg text-text-dark leading-relaxed font-medium">
          Services for all hair types, styles, and personal preferences
        </p>
      </div>
    </div>
  </div>
);

// What's Included Section for Hair & Makeup Proposals
export const HairMakeupWhatsIncludedSection: React.FC = () => (
  <div className="card-large">
    <h2 className="h2 mb-10">What's Included</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="flex items-center space-x-4 p-4 bg-neutral-light-gray rounded-xl">
        <img
          src="/Holiday Proposal/Our Services/Holiday Party Glam/icon.svg"
          alt="Barber Cut"
          className="w-12 h-12 flex-shrink-0"
        />
        <div>
          <p className="font-bold text-shortcut-navy-blue">Barber Cut</p>
          <p className="text-sm text-text-dark-60">Professional men's haircuts</p>
        </div>
      </div>
      <div className="flex items-center space-x-4 p-4 bg-neutral-light-gray rounded-xl">
        <img
          src="/Holiday Proposal/Our Services/Holiday Party Glam/icon-1.svg"
          alt="Beard Trim"
          className="w-12 h-12 flex-shrink-0"
        />
        <div>
          <p className="font-bold text-shortcut-navy-blue">Beard Trim</p>
          <p className="text-sm text-text-dark-60">Shaping and grooming</p>
        </div>
      </div>
      <div className="flex items-center space-x-4 p-4 bg-neutral-light-gray rounded-xl">
        <img
          src="/Holiday Proposal/Our Services/Holiday Party Glam/icon-2.svg"
          alt="Makeup"
          className="w-12 h-12 flex-shrink-0"
        />
        <div>
          <p className="font-bold text-shortcut-navy-blue">Makeup Application</p>
          <p className="text-sm text-text-dark-60">Natural to glamorous looks</p>
        </div>
      </div>
      <div className="flex items-center space-x-4 p-4 bg-neutral-light-gray rounded-xl">
        <img
          src="/Holiday Proposal/Our Services/Holiday Party Glam/icon-3.svg"
          alt="Salon Cut & Style"
          className="w-12 h-12 flex-shrink-0"
        />
        <div>
          <p className="font-bold text-shortcut-navy-blue">Salon Cut & Style</p>
          <p className="text-sm text-text-dark-60">Full haircut and styling</p>
        </div>
      </div>
      <div className="flex items-center space-x-4 p-4 bg-neutral-light-gray rounded-xl">
        <img
          src="/Holiday Proposal/Our Services/Holiday Party Glam/icon-4.svg"
          alt="Hot Towel Shave"
          className="w-12 h-12 flex-shrink-0"
        />
        <div>
          <p className="font-bold text-shortcut-navy-blue">Hot Towel Shave</p>
          <p className="text-sm text-text-dark-60">Classic barbershop experience</p>
        </div>
      </div>
      <div className="flex items-center space-x-4 p-4 bg-neutral-light-gray rounded-xl">
        <img
          src="/Holiday Proposal/Our Services/Holiday Party Glam/Frame 1278723.svg"
          alt="Blowout"
          className="w-12 h-12 flex-shrink-0"
        />
        <div>
          <p className="font-bold text-shortcut-navy-blue">Blowout</p>
          <p className="text-sm text-text-dark-60">Volume and styling with hot tools</p>
        </div>
      </div>
    </div>

    {/* Additional Features List */}
    <div className="mt-8 p-6 bg-gradient-to-r from-shortcut-teal/5 to-transparent rounded-xl border-l-4 border-shortcut-teal">
      <p className="font-bold text-shortcut-navy-blue mb-4">Every styling event includes:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-shortcut-teal flex-shrink-0" />
          <span className="text-text-dark">Services for all hair types</span>
        </div>
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-shortcut-teal flex-shrink-0" />
          <span className="text-text-dark">Premium brand products</span>
        </div>
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-shortcut-teal flex-shrink-0" />
          <span className="text-text-dark">Sanitation between clients</span>
        </div>
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-shortcut-teal flex-shrink-0" />
          <span className="text-text-dark">Space left pristine</span>
        </div>
      </div>
    </div>
  </div>
);

import React from 'react';
import { Heart, Sparkles, Users, Shield, CheckCircle } from 'lucide-react';

// Why Shortcut Section for Nails Proposals
export const NailsWhyShortcutSection: React.FC = () => (
  <div className="card-large bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 border-2 border-shortcut-teal border-opacity-20">
    <h2 className="h2 mb-8 text-shortcut-navy-blue">Why Shortcut?</h2>
    <p className="text-lg font-medium text-text-dark mb-6 leading-relaxed">
      With Shortcut, you can count on:
    </p>
    <div className="space-y-6">
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">Licensed Nail Technicians</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            All technicians are fully licensed, experienced, and insured for access to any office building.
          </p>
        </div>
      </div>
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">Hygiene First</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            Single-use nail kits for every appointment and sanitized metal tools between each client for maximum safety.
          </p>
        </div>
      </div>
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">Wide Selection</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            Over 20 polish colors to choose from, including classic, trendy, and seasonal options.
          </p>
        </div>
      </div>
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">Relaxing Atmosphere</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            We bring the spa to you with soothing music and calming scents for a true pampering experience.
          </p>
        </div>
      </div>
    </div>
  </div>
);

// Benefits Section for Nails Proposals
export const NailsBenefitsSection: React.FC = () => (
  <div className="card-large">
    <h2 className="h2 mb-10">Employee Benefits</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="p-8 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border-2 border-shortcut-teal border-opacity-30 hover:border-opacity-50 hover:shadow-lg transition-all">
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-shortcut-teal bg-opacity-20 flex items-center justify-center flex-shrink-0">
            <Heart className="w-6 h-6 text-shortcut-blue" />
          </div>
          <h3 className="text-xl font-extrabold text-shortcut-navy-blue">Self-Care Moment</h3>
        </div>
        <p className="text-lg text-text-dark leading-relaxed font-medium">
          A relaxing break from work stress that employees truly appreciate
        </p>
      </div>
      <div className="p-8 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border-2 border-shortcut-teal border-opacity-30 hover:border-opacity-50 hover:shadow-lg transition-all">
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-shortcut-teal bg-opacity-20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-shortcut-blue" />
          </div>
          <h3 className="text-xl font-extrabold text-shortcut-navy-blue">Polished Look</h3>
        </div>
        <p className="text-lg text-text-dark leading-relaxed font-medium">
          Professional, well-groomed appearance that boosts confidence
        </p>
      </div>
      <div className="p-8 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border-2 border-shortcut-teal border-opacity-30 hover:border-opacity-50 hover:shadow-lg transition-all">
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-shortcut-teal bg-opacity-20 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6 text-shortcut-blue" />
          </div>
          <h3 className="text-xl font-extrabold text-shortcut-navy-blue">Team Appreciation</h3>
        </div>
        <p className="text-lg text-text-dark leading-relaxed font-medium">
          A thoughtful perk that shows employees they're valued
        </p>
      </div>
    </div>
  </div>
);

// What's Included Section for Nails Proposals
export const NailsWhatsIncludedSection: React.FC = () => (
  <div className="card-large">
    <h2 className="h2 mb-10">What's Included</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="flex items-center space-x-4 p-4 bg-neutral-light-gray rounded-xl">
        <img
          src="/Holiday Proposal/Our Services/Nails/icon.svg"
          alt="Classic Manicure"
          className="w-12 h-12 flex-shrink-0"
        />
        <div>
          <p className="font-bold text-shortcut-navy-blue">Classic Manicure</p>
          <p className="text-sm text-text-dark-60">Shape, buff, cuticle care & polish</p>
        </div>
      </div>
      <div className="flex items-center space-x-4 p-4 bg-neutral-light-gray rounded-xl">
        <img
          src="/Holiday Proposal/Our Services/Nails/icon-2.svg"
          alt="Gel Manicure"
          className="w-12 h-12 flex-shrink-0"
        />
        <div>
          <p className="font-bold text-shortcut-navy-blue">Gel Manicure</p>
          <p className="text-sm text-text-dark-60">Long-lasting gel polish application</p>
        </div>
      </div>
      <div className="flex items-center space-x-4 p-4 bg-neutral-light-gray rounded-xl">
        <img
          src="/Holiday Proposal/Our Services/Nails/icon-1.svg"
          alt="Dry Pedicure"
          className="w-12 h-12 flex-shrink-0"
        />
        <div>
          <p className="font-bold text-shortcut-navy-blue">Dry Pedicure</p>
          <p className="text-sm text-text-dark-60">Waterless pedicure perfect for office</p>
        </div>
      </div>
      <div className="flex items-center space-x-4 p-4 bg-neutral-light-gray rounded-xl">
        <div className="w-12 h-12 flex-shrink-0 rounded-full bg-shortcut-teal bg-opacity-20 flex items-center justify-center">
          <Shield className="w-6 h-6 text-shortcut-blue" />
        </div>
        <div>
          <p className="font-bold text-shortcut-navy-blue">Hand Treatments</p>
          <p className="text-sm text-text-dark-60">Moisturizing treatments available</p>
        </div>
      </div>
    </div>

    {/* Additional Features List */}
    <div className="mt-8 p-6 bg-gradient-to-r from-shortcut-teal/5 to-transparent rounded-xl border-l-4 border-shortcut-teal">
      <p className="font-bold text-shortcut-navy-blue mb-4">Every nail event includes:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-shortcut-teal flex-shrink-0" />
          <span className="text-text-dark">20+ polish colors</span>
        </div>
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-shortcut-teal flex-shrink-0" />
          <span className="text-text-dark">Single-use nail kits</span>
        </div>
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-shortcut-teal flex-shrink-0" />
          <span className="text-text-dark">Relaxing music & scents</span>
        </div>
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-shortcut-teal flex-shrink-0" />
          <span className="text-text-dark">Fully insured professionals</span>
        </div>
      </div>
    </div>
  </div>
);

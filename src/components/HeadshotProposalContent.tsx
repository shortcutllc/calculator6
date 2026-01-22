import React from 'react';
import { Camera, Users, Sparkles, Clock, CheckCircle, Image, Palette } from 'lucide-react';

// Why Shortcut Section for Headshot Proposals
export const HeadshotWhyShortcutSection: React.FC = () => (
  <div className="card-large bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 border-2 border-shortcut-teal border-opacity-20">
    <h2 className="h2 mb-8 text-shortcut-navy-blue">Why Shortcut?</h2>
    <p className="text-lg font-medium text-text-dark mb-6 leading-relaxed">
      With Shortcut, you can count on:
    </p>
    <div className="space-y-6">
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">Professional Photographers</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            Experienced corporate photographers who specialize in professional headshots and know how to make everyone look their best.
          </p>
        </div>
      </div>
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">All-Inclusive Pricing</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            No hidden fees for equipment, transportation, or setup. Everything is included in one transparent price.
          </p>
        </div>
      </div>
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">Expert Posing Guidance</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            Our photographers provide coaching during each session, ensuring natural, confident expressions every time.
          </p>
        </div>
      </div>
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">Fast Turnaround</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            Professionally retouched photos delivered within 5-7 business days, ready for LinkedIn, websites, and company directories.
          </p>
        </div>
      </div>
    </div>
  </div>
);

// Benefits Section for Headshot Proposals
export const HeadshotBenefitsSection: React.FC = () => (
  <div className="card-large">
    <h2 className="h2 mb-10">Company Benefits</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="p-8 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border-2 border-shortcut-teal border-opacity-30 hover:border-opacity-50 hover:shadow-lg transition-all">
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-shortcut-teal bg-opacity-20 flex items-center justify-center flex-shrink-0">
            <Image className="w-6 h-6 text-shortcut-blue" />
          </div>
          <h3 className="text-xl font-extrabold text-shortcut-navy-blue">Professional Image</h3>
        </div>
        <p className="text-lg text-text-dark leading-relaxed font-medium">
          Consistent, polished appearance across all company platforms and materials
        </p>
      </div>
      <div className="p-8 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border-2 border-shortcut-teal border-opacity-30 hover:border-opacity-50 hover:shadow-lg transition-all">
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-shortcut-teal bg-opacity-20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-shortcut-blue" />
          </div>
          <h3 className="text-xl font-extrabold text-shortcut-navy-blue">Employee Confidence</h3>
        </div>
        <p className="text-lg text-text-dark leading-relaxed font-medium">
          Employees feel valued and look their best in professional photos
        </p>
      </div>
      <div className="p-8 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border-2 border-shortcut-teal border-opacity-30 hover:border-opacity-50 hover:shadow-lg transition-all">
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-shortcut-teal bg-opacity-20 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6 text-shortcut-blue" />
          </div>
          <h3 className="text-xl font-extrabold text-shortcut-navy-blue">Brand Consistency</h3>
        </div>
        <p className="text-lg text-text-dark leading-relaxed font-medium">
          Unified visual identity across LinkedIn, websites, and directories
        </p>
      </div>
    </div>
  </div>
);

// What's Included Section for Headshot Proposals
export const HeadshotWhatsIncludedSection: React.FC = () => (
  <div className="card-large">
    <h2 className="h2 mb-10">What's Included</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="flex items-center space-x-4 p-4 bg-neutral-light-gray rounded-xl">
        <img
          src="/Holiday Proposal/Our Services/Headshots/icon.svg"
          alt="Outfit Guidance"
          className="w-12 h-12 flex-shrink-0"
        />
        <div>
          <p className="font-bold text-shortcut-navy-blue">Outfit Guidance</p>
          <p className="text-sm text-text-dark-60">Pre-session consultation on what to wear</p>
        </div>
      </div>
      <div className="flex items-center space-x-4 p-4 bg-neutral-light-gray rounded-xl">
        <img
          src="/Holiday Proposal/Our Services/Headshots/icon-2.svg"
          alt="Background Selection"
          className="w-12 h-12 flex-shrink-0"
        />
        <div>
          <p className="font-bold text-shortcut-navy-blue">Background Selection</p>
          <p className="text-sm text-text-dark-60">Multiple backdrop options to choose from</p>
        </div>
      </div>
      <div className="flex items-center space-x-4 p-4 bg-neutral-light-gray rounded-xl">
        <img
          src="/Holiday Proposal/Our Services/Headshots/icon-1.svg"
          alt="Hair + Makeup Touchups"
          className="w-12 h-12 flex-shrink-0"
        />
        <div>
          <p className="font-bold text-shortcut-navy-blue">Hair + Makeup Touchups</p>
          <p className="text-sm text-text-dark-60">Optional styling before your session</p>
        </div>
      </div>
      <div className="flex items-center space-x-4 p-4 bg-neutral-light-gray rounded-xl">
        <img
          src="/Holiday Proposal/Our Services/Headshots/icon-4.svg"
          alt="Professional Retouching"
          className="w-12 h-12 flex-shrink-0"
        />
        <div>
          <p className="font-bold text-shortcut-navy-blue">Professional Retouching</p>
          <p className="text-sm text-text-dark-60">Flawless editing included with every photo</p>
        </div>
      </div>
    </div>

    {/* Additional Features List */}
    <div className="mt-8 p-6 bg-gradient-to-r from-shortcut-teal/5 to-transparent rounded-xl border-l-4 border-shortcut-teal">
      <p className="font-bold text-shortcut-navy-blue mb-4">Every headshot session includes:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-shortcut-teal flex-shrink-0" />
          <span className="text-text-dark">Top-notch lighting setup</span>
        </div>
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-shortcut-teal flex-shrink-0" />
          <span className="text-text-dark">Expert posing guidance</span>
        </div>
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-shortcut-teal flex-shrink-0" />
          <span className="text-text-dark">5-7 day turnaround</span>
        </div>
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-shortcut-teal flex-shrink-0" />
          <span className="text-text-dark">Pre & event day support</span>
        </div>
      </div>
    </div>
  </div>
);

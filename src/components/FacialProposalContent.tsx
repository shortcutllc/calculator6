import React from 'react';
import { Sparkles, Heart, Shield, Users, CheckCircle } from 'lucide-react';

// Why Shortcut Section for Facial Proposals
export const FacialWhyShortcutSection: React.FC = () => (
  <div className="card-large bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 border-2 border-shortcut-teal border-opacity-20">
    <h2 className="h2 mb-8 text-shortcut-navy-blue">Why Shortcut?</h2>
    <p className="text-lg font-medium text-text-dark mb-6 leading-relaxed">
      With Shortcut, you can count on:
    </p>
    <div className="space-y-6">
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">Licensed Estheticians</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            All estheticians are fully licensed, experienced, and insured for access to any office building.
          </p>
        </div>
      </div>
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">Premium Skincare Products</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            We use only professional-grade, hypoallergenic products suitable for all skin types.
          </p>
        </div>
      </div>
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">Customized Treatments</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            Each facial is tailored to individual skin concerns and preferences for optimal results.
          </p>
        </div>
      </div>
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">Relaxing Experience</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            We create a spa-like atmosphere with soothing music and aromatherapy right in your office.
          </p>
        </div>
      </div>
    </div>
  </div>
);

// Benefits Section for Facial Proposals
export const FacialBenefitsSection: React.FC = () => (
  <div className="card-large">
    <h2 className="h2 mb-10">Employee Benefits</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="p-8 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border-2 border-shortcut-teal border-opacity-30 hover:border-opacity-50 hover:shadow-lg transition-all">
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-shortcut-teal bg-opacity-20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-shortcut-blue" />
          </div>
          <h3 className="text-xl font-extrabold text-shortcut-navy-blue">Glowing Skin</h3>
        </div>
        <p className="text-lg text-text-dark leading-relaxed font-medium">
          Professional treatments that leave skin refreshed, radiant, and rejuvenated
        </p>
      </div>
      <div className="p-8 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border-2 border-shortcut-teal border-opacity-30 hover:border-opacity-50 hover:shadow-lg transition-all">
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-shortcut-teal bg-opacity-20 flex items-center justify-center flex-shrink-0">
            <Heart className="w-6 h-6 text-shortcut-blue" />
          </div>
          <h3 className="text-xl font-extrabold text-shortcut-navy-blue">Self-Care Break</h3>
        </div>
        <p className="text-lg text-text-dark leading-relaxed font-medium">
          A relaxing escape from work stress that employees genuinely appreciate
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
          A thoughtful perk that shows employees they're valued and cared for
        </p>
      </div>
    </div>
  </div>
);

// What's Included Section for Facial Proposals
export const FacialWhatsIncludedSection: React.FC = () => (
  <div className="card-large">
    <h2 className="h2 mb-10">What's Included</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="flex items-center space-x-4 p-4 bg-neutral-light-gray rounded-xl">
        <img
          src="/Holiday Proposal/Our Services/Facials/icon.svg"
          alt="Express Facial"
          className="w-12 h-12 flex-shrink-0"
        />
        <div>
          <p className="font-bold text-shortcut-navy-blue">Express Facial</p>
          <p className="text-sm text-text-dark-60">Quick refresh cleanse & hydration</p>
        </div>
      </div>
      <div className="flex items-center space-x-4 p-4 bg-neutral-light-gray rounded-xl">
        <img
          src="/Holiday Proposal/Our Services/Facials/icon-1.svg"
          alt="Signature Facial"
          className="w-12 h-12 flex-shrink-0"
        />
        <div>
          <p className="font-bold text-shortcut-navy-blue">Signature Facial</p>
          <p className="text-sm text-text-dark-60">Full treatment with extractions</p>
        </div>
      </div>
      <div className="flex items-center space-x-4 p-4 bg-neutral-light-gray rounded-xl">
        <div className="w-12 h-12 flex-shrink-0 rounded-full bg-shortcut-teal bg-opacity-20 flex items-center justify-center">
          <Sparkles className="w-6 h-6 text-shortcut-blue" />
        </div>
        <div>
          <p className="font-bold text-shortcut-navy-blue">LED Light Therapy</p>
          <p className="text-sm text-text-dark-60">Add-on for enhanced results</p>
        </div>
      </div>
      <div className="flex items-center space-x-4 p-4 bg-neutral-light-gray rounded-xl">
        <div className="w-12 h-12 flex-shrink-0 rounded-full bg-shortcut-teal bg-opacity-20 flex items-center justify-center">
          <Shield className="w-6 h-6 text-shortcut-blue" />
        </div>
        <div>
          <p className="font-bold text-shortcut-navy-blue">Mask Treatments</p>
          <p className="text-sm text-text-dark-60">Hydrating & detoxifying options</p>
        </div>
      </div>
    </div>

    {/* Additional Features List */}
    <div className="mt-8 p-6 bg-gradient-to-r from-shortcut-teal/5 to-transparent rounded-xl border-l-4 border-shortcut-teal">
      <p className="font-bold text-shortcut-navy-blue mb-4">Every facial event includes:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-shortcut-teal flex-shrink-0" />
          <span className="text-text-dark">All skin types welcome</span>
        </div>
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-shortcut-teal flex-shrink-0" />
          <span className="text-text-dark">Premium skincare products</span>
        </div>
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-shortcut-teal flex-shrink-0" />
          <span className="text-text-dark">Relaxing spa atmosphere</span>
        </div>
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-shortcut-teal flex-shrink-0" />
          <span className="text-text-dark">Fully insured professionals</span>
        </div>
      </div>
    </div>
  </div>
);

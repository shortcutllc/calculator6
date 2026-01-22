import React from 'react';
import { Shield, Heart, Sparkles, Users, Clock, CheckCircle } from 'lucide-react';

// Why Shortcut Section for Massage Proposals
export const MassageWhyShortcutSection: React.FC = () => (
  <div className="card-large bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 border-2 border-shortcut-teal border-opacity-20">
    <h2 className="h2 mb-8 text-shortcut-navy-blue">Why Shortcut?</h2>
    <p className="text-lg font-medium text-text-dark mb-6 leading-relaxed">
      With Shortcut, you can count on:
    </p>
    <div className="space-y-6">
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">Vetted & Insured Therapists</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            Every massage therapist is fully licensed, background-checked, and insured for access to any office building.
          </p>
        </div>
      </div>
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">Flexible Setup Options</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            Choose between chair or table massages to fit your space. Optional privacy screens available for added comfort.
          </p>
        </div>
      </div>
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">Spa-Like Ambiance</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            We create a relaxing atmosphere with soothing music, aromatherapy scents, and customized lighting right in your office.
          </p>
        </div>
      </div>
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">Therapist Preferences</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            Employees can select their preferred therapist gender for maximum comfort during their session.
          </p>
        </div>
      </div>
    </div>
  </div>
);

// Benefits Section for Massage Proposals
export const MassageBenefitsSection: React.FC = () => (
  <div className="card-large">
    <h2 className="h2 mb-10">Employee Benefits</h2>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <div className="p-8 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border-2 border-shortcut-teal border-opacity-30 hover:border-opacity-50 hover:shadow-lg transition-all">
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-shortcut-teal bg-opacity-20 flex items-center justify-center flex-shrink-0">
            <Heart className="w-6 h-6 text-shortcut-blue" />
          </div>
          <h3 className="text-xl font-extrabold text-shortcut-navy-blue">Stress Relief</h3>
        </div>
        <p className="text-lg text-text-dark leading-relaxed font-medium">
          Immediate tension release and deep relaxation to combat workplace stress
        </p>
      </div>
      <div className="p-8 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border-2 border-shortcut-teal border-opacity-30 hover:border-opacity-50 hover:shadow-lg transition-all">
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-shortcut-teal bg-opacity-20 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-6 h-6 text-shortcut-blue" />
          </div>
          <h3 className="text-xl font-extrabold text-shortcut-navy-blue">Productivity Boost</h3>
        </div>
        <p className="text-lg text-text-dark leading-relaxed font-medium">
          Refreshed employees return to work more focused and energized
        </p>
      </div>
      <div className="p-8 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border-2 border-shortcut-teal border-opacity-30 hover:border-opacity-50 hover:shadow-lg transition-all">
        <div className="flex items-center space-x-3 mb-5">
          <div className="w-12 h-12 rounded-full bg-shortcut-teal bg-opacity-20 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6 text-shortcut-blue" />
          </div>
          <h3 className="text-xl font-extrabold text-shortcut-navy-blue">Team Morale</h3>
        </div>
        <p className="text-lg text-text-dark leading-relaxed font-medium">
          Shows investment in employee wellbeing and builds company culture
        </p>
      </div>
    </div>
  </div>
);

// What's Included Section for Massage Proposals
export const MassageWhatsIncludedSection: React.FC = () => (
  <div className="card-large">
    <h2 className="h2 mb-10">What's Included</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="flex items-center space-x-4 p-4 bg-neutral-light-gray rounded-xl">
        <img
          src="/Holiday Proposal/Our Services/Massage/icon.svg"
          alt="Sports Massage"
          className="w-12 h-12 flex-shrink-0"
        />
        <div>
          <p className="font-bold text-shortcut-navy-blue">Sports Massage</p>
          <p className="text-sm text-text-dark-60">Deep tissue work for muscle recovery</p>
        </div>
      </div>
      <div className="flex items-center space-x-4 p-4 bg-neutral-light-gray rounded-xl">
        <img
          src="/Holiday Proposal/Our Services/Massage/icon-2.svg"
          alt="Compression Massage"
          className="w-12 h-12 flex-shrink-0"
        />
        <div>
          <p className="font-bold text-shortcut-navy-blue">Compression Massage</p>
          <p className="text-sm text-text-dark-60">Rhythmic pressure for circulation</p>
        </div>
      </div>
      <div className="flex items-center space-x-4 p-4 bg-neutral-light-gray rounded-xl">
        <div className="w-12 h-12 flex-shrink-0 rounded-full bg-shortcut-teal bg-opacity-20 flex items-center justify-center">
          <Shield className="w-6 h-6 text-shortcut-blue" />
        </div>
        <div>
          <p className="font-bold text-shortcut-navy-blue">Privacy Screens</p>
          <p className="text-sm text-text-dark-60">Optional screens for added privacy</p>
        </div>
      </div>
      <div className="flex items-center space-x-4 p-4 bg-neutral-light-gray rounded-xl">
        <div className="w-12 h-12 flex-shrink-0 rounded-full bg-shortcut-teal bg-opacity-20 flex items-center justify-center">
          <Clock className="w-6 h-6 text-shortcut-blue" />
        </div>
        <div>
          <p className="font-bold text-shortcut-navy-blue">Flexible Scheduling</p>
          <p className="text-sm text-text-dark-60">Easy online booking for employees</p>
        </div>
      </div>
    </div>

    {/* Additional Features List */}
    <div className="mt-8 p-6 bg-gradient-to-r from-shortcut-teal/5 to-transparent rounded-xl border-l-4 border-shortcut-teal">
      <p className="font-bold text-shortcut-navy-blue mb-4">Every massage event includes:</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-shortcut-teal flex-shrink-0" />
          <span className="text-text-dark">Chair or table massage options</span>
        </div>
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-shortcut-teal flex-shrink-0" />
          <span className="text-text-dark">Relaxing music & aromatherapy</span>
        </div>
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-shortcut-teal flex-shrink-0" />
          <span className="text-text-dark">Therapist gender preference</span>
        </div>
        <div className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-shortcut-teal flex-shrink-0" />
          <span className="text-text-dark">Fully insured professionals</span>
        </div>
      </div>
    </div>
  </div>
);

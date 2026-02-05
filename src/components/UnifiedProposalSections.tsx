import React, { useState } from 'react';
import { Shield, Clock, Sparkles, Users, Heart, CheckCircle, ChevronDown, ChevronUp, Camera, Image, Palette } from 'lucide-react';

// ============================================
// UNIFIED "WHY SHORTCUT?" SECTION
// ============================================
// This replaces all service-specific "Why Shortcut?" sections with
// universal value props that apply across all services.

export const UnifiedWhyShortcutSection: React.FC = () => (
  <div className="card-large bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 border-2 border-shortcut-teal border-opacity-20">
    <h2 className="h2 mb-8 text-shortcut-navy-blue">Why Shortcut?</h2>
    <p className="text-lg font-medium text-text-dark mb-6 leading-relaxed">
      With Shortcut, you can count on:
    </p>
    <div className="space-y-6">
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">Vetted & Insured Professionals</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            Every provider is fully licensed, background-checked, and insured for seamless access to any office building.
          </p>
        </div>
      </div>
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">All-Inclusive Pricing</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            No hidden fees for equipment, setup, or supplies. Everything is included in one transparent price.
          </p>
        </div>
      </div>
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">Effortless Scheduling</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            Easy online booking for employees with automated reminders and flexible appointment management.
          </p>
        </div>
      </div>
      <div className="flex items-start space-x-4">
        <div className="w-3 h-3 rounded-full bg-shortcut-teal mt-2 flex-shrink-0"></div>
        <div>
          <p className="text-lg font-extrabold text-shortcut-navy-blue mb-2">Premium Experience</p>
          <p className="text-base font-medium text-text-dark leading-relaxed">
            We bring the spa to your office with professional equipment, premium products, and a relaxing atmosphere.
          </p>
        </div>
      </div>
    </div>
  </div>
);

// ============================================
// SERVICE ACCORDION COMPONENT
// ============================================

interface ServiceAccordionProps {
  serviceTypes: string[];
}

// Service configuration with display names, icons, and content
const serviceConfig: Record<string, {
  displayName: string;
  icon: string;
  iconPath?: string;
  benefits: Array<{ title: string; description: string; icon: React.ReactNode }>;
  included: Array<{ title: string; description: string; iconPath?: string; icon?: React.ReactNode }>;
  features: string[];
}> = {
  massage: {
    displayName: 'Massage',
    icon: '💆',
    iconPath: '/Holiday Proposal/Our Services/Massage/icon.svg',
    benefits: [
      { title: 'Stress Relief', description: 'Immediate tension release and deep relaxation to combat workplace stress', icon: <Heart className="w-6 h-6 text-shortcut-blue" /> },
      { title: 'Productivity Boost', description: 'Refreshed employees return to work more focused and energized', icon: <Sparkles className="w-6 h-6 text-shortcut-blue" /> },
      { title: 'Team Morale', description: 'Shows investment in employee wellbeing and builds company culture', icon: <Users className="w-6 h-6 text-shortcut-blue" /> },
    ],
    included: [
      { title: 'Sports Massage', description: 'Deep tissue work for muscle recovery', iconPath: '/Holiday Proposal/Our Services/Massage/icon.svg' },
      { title: 'Compression Massage', description: 'Rhythmic pressure for circulation', iconPath: '/Holiday Proposal/Our Services/Massage/icon-2.svg' },
      { title: 'Privacy Screens', description: 'Optional screens for added privacy', icon: <Shield className="w-6 h-6 text-shortcut-blue" /> },
      { title: 'Flexible Scheduling', description: 'Easy online booking for employees', icon: <Clock className="w-6 h-6 text-shortcut-blue" /> },
    ],
    features: ['Chair or table massage options', 'Relaxing music & aromatherapy', 'Therapist gender preference', 'Fully insured professionals'],
  },
  headshot: {
    displayName: 'Headshots',
    icon: '📸',
    iconPath: '/Holiday Proposal/Our Services/Headshots/icon.svg',
    benefits: [
      { title: 'Professional Image', description: 'Consistent, polished appearance across all company platforms and materials', icon: <Image className="w-6 h-6 text-shortcut-blue" /> },
      { title: 'Employee Confidence', description: 'Employees feel valued and look their best in professional photos', icon: <Sparkles className="w-6 h-6 text-shortcut-blue" /> },
      { title: 'Brand Consistency', description: 'Unified visual identity across LinkedIn, websites, and directories', icon: <Users className="w-6 h-6 text-shortcut-blue" /> },
    ],
    included: [
      { title: 'Outfit Guidance', description: 'Pre-session consultation on what to wear', iconPath: '/Holiday Proposal/Our Services/Headshots/icon.svg' },
      { title: 'Background Selection', description: 'Multiple backdrop options to choose from', iconPath: '/Holiday Proposal/Our Services/Headshots/icon-2.svg' },
      { title: 'Hair + Makeup Touchups', description: 'Optional styling before your session', iconPath: '/Holiday Proposal/Our Services/Headshots/icon-1.svg' },
      { title: 'Professional Retouching', description: 'Flawless editing included with every photo', iconPath: '/Holiday Proposal/Our Services/Headshots/icon-4.svg' },
    ],
    features: ['Top-notch lighting setup', 'Expert posing guidance', '5-7 day turnaround', 'Pre & event day support'],
  },
  nails: {
    displayName: 'Nails',
    icon: '💅',
    iconPath: '/Holiday Proposal/Our Services/Nails/icon.svg',
    benefits: [
      { title: 'Self-Care Moment', description: 'A relaxing break from work stress that employees truly appreciate', icon: <Heart className="w-6 h-6 text-shortcut-blue" /> },
      { title: 'Polished Look', description: 'Professional, well-groomed appearance that boosts confidence', icon: <Sparkles className="w-6 h-6 text-shortcut-blue" /> },
      { title: 'Team Appreciation', description: 'A thoughtful perk that shows employees they\'re valued', icon: <Users className="w-6 h-6 text-shortcut-blue" /> },
    ],
    included: [
      { title: 'Classic Manicure', description: 'Shape, buff, cuticle care & polish', iconPath: '/Holiday Proposal/Our Services/Nails/icon.svg' },
      { title: 'Gel Manicure', description: 'Long-lasting gel polish application', iconPath: '/Holiday Proposal/Our Services/Nails/icon-2.svg' },
      { title: 'Dry Pedicure', description: 'Waterless pedicure perfect for office', iconPath: '/Holiday Proposal/Our Services/Nails/icon-1.svg' },
      { title: 'Hand Treatments', description: 'Moisturizing treatments available', icon: <Shield className="w-6 h-6 text-shortcut-blue" /> },
    ],
    features: ['20+ polish colors', 'Single-use nail kits', 'Relaxing music & scents', 'Fully insured professionals'],
  },
  facial: {
    displayName: 'Facials',
    icon: '✨',
    iconPath: '/Holiday Proposal/Our Services/Facials/icon.svg',
    benefits: [
      { title: 'Glowing Skin', description: 'Professional treatments that leave skin refreshed, radiant, and rejuvenated', icon: <Sparkles className="w-6 h-6 text-shortcut-blue" /> },
      { title: 'Self-Care Break', description: 'A relaxing escape from work stress that employees genuinely appreciate', icon: <Heart className="w-6 h-6 text-shortcut-blue" /> },
      { title: 'Team Appreciation', description: 'A thoughtful perk that shows employees they\'re valued and cared for', icon: <Users className="w-6 h-6 text-shortcut-blue" /> },
    ],
    included: [
      { title: 'Express Facial', description: 'Quick refresh cleanse & hydration', iconPath: '/Holiday Proposal/Our Services/Facials/icon.svg' },
      { title: 'Signature Facial', description: 'Full treatment with extractions', iconPath: '/Holiday Proposal/Our Services/Facials/icon-1.svg' },
      { title: 'LED Light Therapy', description: 'Add-on for enhanced results', icon: <Sparkles className="w-6 h-6 text-shortcut-blue" /> },
      { title: 'Mask Treatments', description: 'Hydrating & detoxifying options', icon: <Shield className="w-6 h-6 text-shortcut-blue" /> },
    ],
    features: ['All skin types welcome', 'Premium skincare products', 'Relaxing spa atmosphere', 'Fully insured professionals'],
  },
  'hair-makeup': {
    displayName: 'Hair & Makeup',
    icon: '💇',
    iconPath: '/Holiday Proposal/Our Services/Holiday Party Glam/icon.svg',
    benefits: [
      { title: 'Event-Ready', description: 'Perfect for headshots, holiday parties, presentations, or any special occasion', icon: <Sparkles className="w-6 h-6 text-shortcut-blue" /> },
      { title: 'Time Savings', description: 'Professional styling without leaving the office or taking personal time', icon: <Clock className="w-6 h-6 text-shortcut-blue" /> },
      { title: 'Inclusive Options', description: 'Services for all hair types, styles, and personal preferences', icon: <Users className="w-6 h-6 text-shortcut-blue" /> },
    ],
    included: [
      { title: 'Barber Cut', description: 'Professional men\'s haircuts', iconPath: '/Holiday Proposal/Our Services/Holiday Party Glam/icon.svg' },
      { title: 'Beard Trim', description: 'Shaping and grooming', iconPath: '/Holiday Proposal/Our Services/Holiday Party Glam/icon-1.svg' },
      { title: 'Makeup Application', description: 'Natural to glamorous looks', iconPath: '/Holiday Proposal/Our Services/Holiday Party Glam/icon-2.svg' },
      { title: 'Salon Cut & Style', description: 'Full haircut and styling', iconPath: '/Holiday Proposal/Our Services/Holiday Party Glam/icon-3.svg' },
      { title: 'Hot Towel Shave', description: 'Classic barbershop experience', iconPath: '/Holiday Proposal/Our Services/Holiday Party Glam/icon-4.svg' },
      { title: 'Blowout', description: 'Volume and styling with hot tools', iconPath: '/Holiday Proposal/Our Services/Holiday Party Glam/Frame 1278723.svg' },
    ],
    features: ['Services for all hair types', 'Premium brand products', 'Sanitation between clients', 'Space left pristine'],
  },
};

// Map various service type strings to their config keys
const getServiceConfigKey = (serviceType: string): string | null => {
  const type = serviceType.toLowerCase();

  if (type === 'massage') return 'massage';
  if (['headshot', 'headshots', 'headshot-hair-makeup'].includes(type)) return 'headshot';
  if (['nails', 'nails-service'].includes(type)) return 'nails';
  if (['facial', 'facials'].includes(type)) return 'facial';
  if (['hair-makeup', 'hair', 'makeup'].includes(type)) return 'hair-makeup';

  return null;
};

// Individual accordion item for a service
interface ServiceAccordionItemProps {
  serviceKey: string;
  isOpen: boolean;
  onToggle: () => void;
  isOnly: boolean;
}

const ServiceAccordionItem: React.FC<ServiceAccordionItemProps> = ({ serviceKey, isOpen, onToggle, isOnly }) => {
  const config = serviceConfig[serviceKey];
  if (!config) return null;

  return (
    <div className="border-2 border-shortcut-teal border-opacity-20 rounded-2xl overflow-hidden transition-all duration-300">
      {/* Accordion Header */}
      <button
        onClick={onToggle}
        className="w-full px-6 py-5 flex items-center justify-between bg-gradient-to-r from-shortcut-teal/5 to-transparent hover:from-shortcut-teal/10 transition-all"
      >
        <div className="flex items-center space-x-4">
          {config.iconPath ? (
            <img src={config.iconPath} alt={config.displayName} className="w-10 h-10" />
          ) : (
            <span className="text-3xl">{config.icon}</span>
          )}
          <div className="text-left">
            <h3 className="text-xl font-bold text-shortcut-navy-blue">{config.displayName}</h3>
            <p className="text-sm text-text-dark opacity-70">
              {isOpen ? 'Click to collapse' : 'Click to see benefits & what\'s included'}
            </p>
          </div>
        </div>
        <div className={`transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          <ChevronDown className="w-6 h-6 text-shortcut-teal" />
        </div>
      </button>

      {/* Accordion Content */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-6 py-6 space-y-8 bg-white">
          {/* Benefits Section */}
          <div>
            <h4 className="text-lg font-bold text-shortcut-navy-blue mb-4">Benefits</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {config.benefits.map((benefit, idx) => (
                <div
                  key={idx}
                  className="p-5 bg-gradient-to-br from-shortcut-teal/10 to-shortcut-teal/5 rounded-xl border border-shortcut-teal border-opacity-20"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-shortcut-teal bg-opacity-20 flex items-center justify-center flex-shrink-0">
                      {benefit.icon}
                    </div>
                    <h5 className="text-base font-bold text-shortcut-navy-blue">{benefit.title}</h5>
                  </div>
                  <p className="text-sm text-text-dark leading-relaxed">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* What's Included Section */}
          <div>
            <h4 className="text-lg font-bold text-shortcut-navy-blue mb-4">What's Included</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {config.included.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center space-x-4 p-4 bg-neutral-light-gray rounded-xl"
                >
                  {item.iconPath ? (
                    <img src={item.iconPath} alt={item.title} className="w-10 h-10 flex-shrink-0" />
                  ) : item.icon ? (
                    <div className="w-10 h-10 flex-shrink-0 rounded-full bg-shortcut-teal bg-opacity-20 flex items-center justify-center">
                      {item.icon}
                    </div>
                  ) : null}
                  <div>
                    <p className="font-bold text-shortcut-navy-blue text-sm">{item.title}</p>
                    <p className="text-xs text-text-dark-60">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Features List */}
            <div className="mt-6 p-5 bg-gradient-to-r from-shortcut-teal/5 to-transparent rounded-xl border-l-4 border-shortcut-teal">
              <p className="font-bold text-shortcut-navy-blue mb-3 text-sm">Every {config.displayName.toLowerCase()} event includes:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {config.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-shortcut-teal flex-shrink-0" />
                    <span className="text-sm text-text-dark">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main accordion component that renders all service accordions
export const ServiceDetailsAccordion: React.FC<ServiceAccordionProps> = ({ serviceTypes }) => {
  // Get unique service config keys
  const uniqueServiceKeys = Array.from(new Set(
    serviceTypes
      .map(getServiceConfigKey)
      .filter((key): key is string => key !== null)
  ));

  // State to track which accordions are open
  // Default all services to open on page load
  const [openAccordions, setOpenAccordions] = useState<Set<string>>(
    new Set(uniqueServiceKeys)
  );

  const toggleAccordion = (serviceKey: string) => {
    setOpenAccordions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(serviceKey)) {
        newSet.delete(serviceKey);
      } else {
        newSet.add(serviceKey);
      }
      return newSet;
    });
  };

  // Don't render if no valid services
  if (uniqueServiceKeys.length === 0) return null;

  const isOnlyOneService = uniqueServiceKeys.length === 1;

  return (
    <div className="card-large">
      <div className="flex items-center justify-between mb-6">
        <h2 className="h2 text-shortcut-navy-blue">
          {isOnlyOneService ? 'Service Details' : 'Your Services'}
        </h2>
        {!isOnlyOneService && (
          <p className="text-sm text-text-dark opacity-60">
            {uniqueServiceKeys.length} services included
          </p>
        )}
      </div>

      {!isOnlyOneService && (
        <p className="text-base text-text-dark mb-6 leading-relaxed">
          Click on each service below to see the benefits and what's included.
        </p>
      )}

      <div className="space-y-4">
        {uniqueServiceKeys.map(serviceKey => (
          <ServiceAccordionItem
            key={serviceKey}
            serviceKey={serviceKey}
            isOpen={openAccordions.has(serviceKey)}
            onToggle={() => toggleAccordion(serviceKey)}
            isOnly={isOnlyOneService}
          />
        ))}
      </div>
    </div>
  );
};

// Export a convenience component that combines both
interface UnifiedServiceSectionsProps {
  serviceTypes: string[];
  showWhyShortcut?: boolean;
}

export const UnifiedServiceSections: React.FC<UnifiedServiceSectionsProps> = ({
  serviceTypes,
  showWhyShortcut = true
}) => {
  // Filter out mindfulness services as they have their own sections
  const nonMindfulnessTypes = serviceTypes.filter(type =>
    !type.toLowerCase().startsWith('mindfulness')
  );

  if (nonMindfulnessTypes.length === 0) return null;

  return (
    <>
      {showWhyShortcut && <UnifiedWhyShortcutSection />}
      <ServiceDetailsAccordion serviceTypes={nonMindfulnessTypes} />
    </>
  );
};

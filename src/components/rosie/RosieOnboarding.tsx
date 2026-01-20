import React, { useState } from 'react';
import { BabyProfile } from './types';

interface RosieOnboardingProps {
  onComplete: (profile: BabyProfile) => void;
}

export const RosieOnboarding: React.FC<RosieOnboardingProps> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !birthDate) return;

    setIsSubmitting(true);

    // Small delay for visual feedback
    setTimeout(() => {
      onComplete({
        name: name.trim(),
        birthDate: birthDate,
      });
    }, 300);
  };

  // Calculate max date (today) and min date (1 year ago)
  const today = new Date().toISOString().split('T')[0];
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const minDate = oneYearAgo.toISOString().split('T')[0];

  return (
    <div className="rosie-onboarding">
      <div className="rosie-onboarding-content">
        <div className="rosie-onboarding-logo">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="30" fill="#E8B4BC" fillOpacity="0.2"/>
            <circle cx="32" cy="32" r="20" fill="#E8B4BC" fillOpacity="0.4"/>
            <circle cx="32" cy="32" r="10" fill="#E8B4BC"/>
          </svg>
        </div>
        <h1 className="rosie-onboarding-title">Rosie</h1>
        <p className="rosie-onboarding-subtitle">
          Your calm companion for the first year
        </p>

        <form className="rosie-onboarding-form" onSubmit={handleSubmit}>
          <div className="rosie-onboarding-field">
            <label className="rosie-onboarding-label" htmlFor="baby-name">
              What's your baby's name?
            </label>
            <input
              id="baby-name"
              type="text"
              className="rosie-input"
              placeholder="Baby's name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </div>

          <div className="rosie-onboarding-field">
            <label className="rosie-onboarding-label" htmlFor="birth-date">
              When was {name || 'your baby'} born?
            </label>
            <input
              id="birth-date"
              type="date"
              className="rosie-input"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              max={today}
              min={minDate}
            />
          </div>

          <button
            type="submit"
            className="rosie-btn-primary"
            disabled={!name.trim() || !birthDate || isSubmitting}
          >
            {isSubmitting ? 'Getting started...' : 'Get Started'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RosieOnboarding;

import React from 'react';

// "Building entry and parking" under each office address in the post-approval
// survey (ProposalSurveyForm). Optional. Parking rarely exists in New York
// City, so there the hint says it can be left out.

/** True for a New York City address or location name. */
export function isNycAddress(...parts: (string | undefined | null)[]): boolean {
  const text = parts.filter(Boolean).join(' ');
  return (
    /\b(new york,?\s*ny|nyc|manhattan|brooklyn|queens|bronx|staten island)\b/i.test(text) ||
    /\bNY\s*1(0[0-4]|1[0-6])\d{2}\b/.test(text)
  );
}

interface Props {
  id: string;
  value: string;
  onChange: (value: string) => void;
  nyc: boolean;
}

const EntryParkingField: React.FC<Props> = ({ id, value, onChange, nyc }) => (
  <div className="mt-3">
    <label htmlFor={id} className="block text-sm font-semibold text-gray-700">
      Building entry and parking (optional)
    </label>
    <p className="mt-1 text-xs text-gray-600">
      {nyc
        ? "How our team gets into the building and where equipment comes in. Parking usually isn't available in New York City, so you can leave that part out."
        : "How our team gets into the building, where equipment comes in, and where our team can park if there's parking."}
    </p>
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={2}
      placeholder={
        nyc
          ? 'For example: check in with ID at the lobby security desk, and bring equipment through the loading dock.'
          : 'For example: check in at the front desk, and park in the garage under the building on level P2.'
      }
      className="mt-2 w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal"
    />
  </div>
);

export default EntryParkingField;

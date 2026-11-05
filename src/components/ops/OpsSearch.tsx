import React from 'react';
import { Search } from 'lucide-react';

// The one search box on the staffing pages. The icon sits in its own gutter
// (.ops-search in ops-dashboard.css): a Tailwind pl-* on .ops-input loses to the
// input's own padding, which is how the icon ended up on top of the text before.
export const OpsSearch: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  label?: string;
}> = ({ value, onChange, placeholder, autoFocus, label }) => (
  <label className="ops-search">
    <Search size={18} strokeWidth={2.25} aria-hidden />
    <input
      type="search"
      className="ops-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={label || placeholder}
      autoFocus={autoFocus}
    />
  </label>
);

export default OpsSearch;

import React from 'react';

/**
 * Shared brand tokens and primitives for the headshot surfaces.
 *
 * Extracted from the EmployeeGallery / ManagerGallery restyle (3c93c3b) so the
 * photographer screens speak the same language as the client-facing ones.
 * Canonical palette lives in tailwind.config.js.
 */
export const INK = 'text-[#032232]';
export const SOFT = 'text-[#45596A]';
export const LINE = 'border-[#E2E9E8]';
export const NAVY = '#003756';
export const CORAL = '#FF5050';
export const CYAN = '#9EFAFF';
export const SHADOW =
  'shadow-[0_1px_2px_rgba(3,34,50,.05),0_10px_30px_rgba(3,34,50,.06)]';

/** Sticky nav: client logo (name fallback), "with Shortcut", optional right slot. */
export const BrandNav: React.FC<{
  logoUrl?: string | null;
  name?: string | null;
  right?: React.ReactNode;
}> = ({ logoUrl, name, right }) => (
  <nav className="sticky top-0 z-40 h-16 border-b border-black/[.08] bg-white">
    <div className="mx-auto flex h-full max-w-[1140px] items-center justify-between gap-4 px-5 md:px-7">
      <div className="flex items-center gap-3.5">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={name || 'Client'}
            className="h-7 w-auto max-w-[200px] object-contain"
          />
        ) : name ? (
          <span className="text-[17px] font-extrabold tracking-[-.02em] text-[#003756]">
            {name}
          </span>
        ) : null}
        {(logoUrl || name) && <span className="h-6 w-px bg-black/10" />}
        <span className="flex items-center gap-[7px] text-[11px] font-bold text-[rgba(3,34,50,.45)]">
          <span>with</span>
          <img
            src="/conference/shortcut-logo-rgb.svg"
            alt="Shortcut"
            className="block h-4 w-auto"
          />
        </span>
      </div>
      {right}
    </div>
  </nav>
);

/** Coral-dot kicker above a statement headline. */
export const Kicker: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mb-3 flex items-center gap-[9px] text-[12px] font-bold uppercase tracking-[.09em] text-[#45596A]">
    <span className="h-[7px] w-[7px] flex-none rounded-full bg-[#FF5050]" />
    {children}
  </p>
);

/** Statement headline. */
export const Headline: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h1 className="text-[clamp(28px,4vw,40px)] font-extrabold leading-[1.06] tracking-[-.03em] text-[#003756]">
    {children}
  </h1>
);

/** Supporting line under a headline. */
export const Sub: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className={`mt-3 max-w-[52ch] text-[16px] leading-[1.5] ${SOFT}`}>{children}</p>
);

/** 18px brand card. `tone` picks the surface. */
export const Card: React.FC<{
  tone?: 'white' | 'mist' | 'navy';
  className?: string;
  children: React.ReactNode;
}> = ({ tone = 'white', className = '', children }) => {
  const tones = {
    white: `border ${LINE} bg-white`,
    mist: 'bg-[#F1F6F5]',
    navy: 'bg-[#003756]',
  };
  return (
    <div className={`rounded-[18px] ${tones[tone]} ${SHADOW} ${className}`}>{children}</div>
  );
};

/** Primary coral pill action. */
export const CoralButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({ className = '', children, ...rest }) => (
  <button
    {...rest}
    className={`inline-flex items-center gap-2 rounded-full bg-[#FF5050] px-6 py-3 text-[14.5px] font-bold text-white shadow-[0_4px_14px_rgba(255,80,80,.3)] transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 ${className}`}
  >
    {children}
  </button>
);

/** Secondary navy-outline pill action. */
export const OutlineButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({ className = '', children, ...rest }) => (
  <button
    {...rest}
    className={`inline-flex items-center gap-2 rounded-full border-2 border-[#003756] bg-white px-6 py-3 text-[14.5px] font-bold text-[#003756] transition-colors hover:bg-[#F1F6F5] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
  >
    {children}
  </button>
);

/** Status pill. Navy = done, cyan = in progress, mist = not started. */
export const StatusPill: React.FC<{
  tone: 'navy' | 'cyan' | 'mist';
  children: React.ReactNode;
}> = ({ tone, children }) => {
  const tones = {
    navy: 'bg-[#003756] text-[#9EFAFF]',
    cyan: 'bg-[#9EFAFF] text-[#003756]',
    mist: 'bg-[#F1F6F5] text-[#45596A]',
  };
  return (
    <span
      className={`inline-flex flex-none items-center rounded-full px-4 py-2 text-[12px] font-extrabold ${tones[tone]}`}
    >
      {children}
    </span>
  );
};

/** Conference-style stat tile. */
export const Stat: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <div className={`rounded-[18px] border ${LINE} bg-white px-6 py-5 ${SHADOW}`}>
    <p className="text-[11px] font-bold uppercase tracking-[.09em] text-[#45596A]">
      {label}
    </p>
    <p className="mt-1.5 text-[30px] font-extrabold leading-none tracking-[-.03em] text-[#003756]">
      {value}
    </p>
  </div>
);

/** Page shell for the admin headshot screens. */
export const Page: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className={`min-h-screen bg-white font-sans leading-[1.55] ${INK}`}>
    <div className="mx-auto max-w-[1140px] px-5 pb-16 md:px-7">{children}</div>
  </div>
);

/** Section heading used above a card or table. */
export const SectionHead: React.FC<{
  title: string;
  sub?: string;
  right?: React.ReactNode;
}> = ({ title, sub, right }) => (
  <div className={`flex flex-wrap items-center justify-between gap-3 border-b ${LINE} px-6 py-5`}>
    <div>
      <h2 className="text-[17px] font-extrabold tracking-[-.02em] text-[#003756]">{title}</h2>
      {sub && <p className={`mt-1 text-[14px] ${SOFT}`}>{sub}</p>}
    </div>
    {right}
  </div>
);

/** Underlined tab bar. */
export const Tabs: React.FC<{
  tabs: { key: string; label: string; icon?: React.ReactNode }[];
  active: string;
  onChange: (key: string) => void;
}> = ({ tabs, active, onChange }) => (
  <div className={`border-b ${LINE}`}>
    <nav className="-mb-px flex gap-7">
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={`flex items-center gap-2 border-b-[3px] px-1 py-3 text-[14.5px] font-bold transition-colors ${
            active === t.key
              ? 'border-[#FF5050] text-[#003756]'
              : `border-transparent ${SOFT} hover:text-[#003756]`
          }`}
        >
          {t.icon}
          {t.label}
        </button>
      ))}
    </nav>
  </div>
);

/** Text input matching the brand forms. */
export const Field: React.FC<{
  label: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, hint, children }) => (
  <div>
    <label className="mb-1.5 block text-[12.5px] font-bold uppercase tracking-[.06em] text-[#45596A]">
      {label}
    </label>
    {children}
    {hint && <p className={`mt-1.5 text-[13px] ${SOFT}`}>{hint}</p>}
  </div>
);

/** Shared input class so every headshot form field matches. */
export const inputClass =
  'w-full rounded-[14px] border-2 border-[#E2E9E8] px-4 py-2.5 text-[14.5px] text-[#032232] placeholder:text-[#45596A]/60 focus:border-[#003756] focus:outline-none';

/** Modal shell: dimmed navy backdrop, brand card. */
export const Modal: React.FC<{
  onClose: () => void;
  title: string;
  sub?: string;
  wide?: boolean;
  children: React.ReactNode;
}> = ({ onClose, title, sub, wide, children }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(3,34,50,.55)] p-4">
    <div
      className={`max-h-[90vh] w-full overflow-y-auto rounded-[18px] border ${LINE} bg-white ${SHADOW} ${
        wide ? 'max-w-3xl' : 'max-w-lg'
      }`}
    >
      <div className={`flex items-start justify-between gap-4 border-b ${LINE} p-6`}>
        <div>
          <h2 className="text-[20px] font-extrabold tracking-[-.02em] text-[#003756]">{title}</h2>
          {sub && <p className={`mt-1.5 text-[14px] ${SOFT}`}>{sub}</p>}
        </div>
        <button
          onClick={onClose}
          className={`flex-none rounded-full p-1 ${SOFT} transition-colors hover:bg-[#F1F6F5] hover:text-[#003756]`}
          aria-label="Close"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

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

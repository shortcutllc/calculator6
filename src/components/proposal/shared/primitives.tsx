import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Heart, Camera, Sparkles, ChevronDown, Clock, Check } from 'lucide-react';
import {
  SERVICE_DISPLAY,
  SERVICE_CHIP_COLORS,
  SERVICE_GRAPHIC,
  SERVICE_IMAGE_PATH,
  FREQ_OPTIONS,
} from '../data';
import { useIsCompact } from './useIsMobile';

// ============================================================================
// Tokens — convenience shortcuts for the design system CSS variables. Use
// these in inline styles to stay aligned with proposal-viewer.css. The CSS
// package is the canonical source; this object just spares us repeating
// `var(--pv-*)` everywhere.
// ============================================================================
export const T = {
  // Colors
  navy: 'var(--pv-navy)',
  deepNavy: 'var(--pv-deep-navy)',
  coral: 'var(--pv-coral)',
  aqua: 'var(--pv-aqua)',
  teal: 'var(--pv-teal)',
  pink: 'var(--pv-pink)',
  yellow: 'var(--pv-yellow)',
  beige: 'var(--pv-beige)',
  lightGray: 'var(--pv-light-gray)',
  fgMuted: 'var(--pv-fg-muted)',
  success: 'var(--pv-success)',
  warning: 'var(--pv-warning)',
  error: 'var(--pv-error)',
  // Fonts
  fontD: "'Outfit', system-ui, sans-serif",
  fontUi: "'Inter', system-ui, sans-serif",
};

// ============================================================================
// Eyebrow — 11px Inter all-caps label
// ============================================================================
interface EyebrowProps {
  children: React.ReactNode;
  color?: string;
  style?: React.CSSProperties;
}
export const Eyebrow: React.FC<EyebrowProps> = ({ children, color, style }) => (
  <div
    style={{
      fontFamily: T.fontUi,
      fontWeight: 700,
      fontSize: 11,
      color: color || T.fgMuted,
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      ...style,
    }}
  >
    {children}
  </div>
);

// ============================================================================
// CardHeading — display headings in 3 sizes (section / card / item)
// ============================================================================
type HeadingSize = 'section' | 'card' | 'item';
const HEADING_SIZES: Record<HeadingSize, { fz: number; lh: number; ls: string }> = {
  section: { fz: 32, lh: 1.1, ls: '-0.02em' },
  card: { fz: 22, lh: 1.15, ls: '-0.015em' },
  item: { fz: 20, lh: 1.2, ls: '-0.01em' },
};
interface CardHeadingProps {
  size?: HeadingSize;
  children: React.ReactNode;
  style?: React.CSSProperties;
}
export const CardHeading: React.FC<CardHeadingProps> = ({
  size = 'card',
  children,
  style,
}) => {
  const t = HEADING_SIZES[size];
  return (
    <h2
      style={{
        fontFamily: T.fontD,
        fontWeight: 700,
        color: T.navy,
        fontSize: t.fz,
        lineHeight: t.lh,
        letterSpacing: t.ls,
        margin: 0,
        ...style,
      }}
    >
      {children}
    </h2>
  );
};

// ============================================================================
// StatusPill
// ============================================================================
type StatusValue = 'draft' | 'pending_review' | 'has_changes' | 'approved' | 'sent';
const STATUS_MAP: Record<StatusValue, { label: string; bg: string; color: string; dot: string }> = {
  draft: { label: 'Draft', bg: '#F1F6F5', color: 'var(--pv-navy)', dot: '#9CA3AF' },
  pending_review: {
    label: 'Pending review',
    bg: 'rgba(254,220,100,.25)',
    color: '#8C5A07',
    dot: '#F2A93B',
  },
  has_changes: {
    label: 'Changes requested',
    bg: 'rgba(255,80,80,.12)',
    color: 'var(--pv-coral)',
    dot: 'var(--pv-coral)',
  },
  approved: {
    label: 'Approved',
    bg: 'rgba(30,158,106,.14)',
    color: 'var(--pv-success)',
    dot: 'var(--pv-success)',
  },
  sent: {
    label: 'Sent',
    bg: 'rgba(158,250,255,.4)',
    color: 'var(--pv-navy)',
    dot: 'var(--pv-teal)',
  },
};
interface StatusPillProps {
  status: StatusValue;
  size?: 'md' | 'lg';
}
export const StatusPill: React.FC<StatusPillProps> = ({ status, size = 'md' }) => {
  const t = STATUS_MAP[status] || STATUS_MAP.draft;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: t.bg,
        color: t.color,
        padding: size === 'lg' ? '8px 16px' : '5px 12px',
        borderRadius: 9999,
        fontFamily: T.fontUi,
        fontWeight: 700,
        fontSize: size === 'lg' ? 13 : 12,
        letterSpacing: '.01em',
      }}
    >
      <span
        style={{ width: 7, height: 7, borderRadius: '50%', background: t.dot }}
      />
      {t.label}
    </span>
  );
};

// ============================================================================
// ServiceImage — production photo if available, gradient placeholder otherwise
// ============================================================================
interface ServiceImageProps {
  serviceType: string;
  // Massage is the one service with photo variants: table massage uses its own
  // slider image, chair/generic massage uses the default. Other services ignore this.
  massageType?: string;
  height?: number;
  width?: number | string;
  style?: React.CSSProperties;
}
const GLYPH_MAP: Record<string, React.ComponentType<any>> = {
  Heart,
  Camera,
  Sparkles,
};
export const ServiceImage: React.FC<ServiceImageProps> = ({
  serviceType,
  massageType,
  height = 160,
  width = '100%',
  style,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  // Table massage has its own photo; chair/generic massage and everything else
  // key straight off serviceType.
  const imageKey =
    serviceType === 'massage' && massageType === 'table'
      ? 'table-massage'
      : serviceType;
  const photo = SERVICE_IMAGE_PATH[imageKey];
  const g = SERVICE_GRAPHIC[serviceType] || SERVICE_GRAPHIC.massage;
  const Glyph = GLYPH_MAP[g.glyph] || Sparkles;

  if (photo && !imgFailed) {
    return (
      <div
        style={{
          width,
          height,
          borderRadius: 16,
          overflow: 'hidden',
          flexShrink: 0,
          ...style,
        }}
      >
        <img
          src={photo}
          alt=""
          onError={() => setImgFailed(true)}
          // The shipped PNGs have a baked-in decorative border. Scaling
          // the img with transform:scale crops that ring uniformly from
          // the center — using margin/width% would skew because CSS
          // margin% is resolved against the parent's WIDTH only, so the
          // vertical shift wouldn't match the horizontal one.
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            transform: 'scale(1.1)',
            // The table-massage photo frames its subject toward the left, so it
            // jams against the left edge under a center crop. Nudge the crop
            // window left (subject shifts right) for a balanced portrait. The
            // cover overflow is large enough that this never reveals the
            // baked-in border. Other photos keep the default center crop.
            objectPosition: imageKey === 'table-massage' ? '40% 50%' : '50% 50%',
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width,
        height,
        borderRadius: 16,
        background: g.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
        ...style,
      }}
    >
      <Glyph size={Math.floor(height * 0.32)} color={g.accent} strokeWidth={1.5} />
    </div>
  );
};

// ============================================================================
// Editable — inline-editable value. Falls back to plain display when !editing.
// ============================================================================
interface EditableProps {
  value: string | number | undefined;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  editing?: boolean;
  type?: string;
  width?: number;
  suffix?: string;
  prefix?: string;
  align?: 'left' | 'right' | 'center';
}
export const Editable: React.FC<EditableProps> = ({
  value,
  onChange,
  editing,
  type = 'text',
  width,
  suffix,
  prefix,
  align = 'left',
}) => {
  // Hold what the user is actively typing as a raw string. Without this, a
  // parent that coerces each keystroke to a Number (e.g. handleEdit → Number())
  // feeds the coerced value straight back as the controlled value, which
  // strips a trailing decimal point the instant it's typed — making fractional
  // entries like "1.5" impossible (you'd be stuck on whole numbers). While the
  // field is focused we show the buffer verbatim; when it isn't, we mirror the
  // canonical value from props (so recalcs / option selects stay authoritative).
  const [focused, setFocused] = useState(false);
  const [buffer, setBuffer] = useState<string>(value == null ? '' : String(value));

  useEffect(() => {
    if (!focused) setBuffer(value == null ? '' : String(value));
  }, [value, focused]);

  if (!editing) {
    return (
      <span style={{ fontFamily: T.fontD, fontWeight: 600, color: T.navy }}>
        {prefix}
        {value}
        {suffix}
      </span>
    );
  }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {prefix && (
        <span style={{ fontFamily: T.fontD, color: T.fgMuted }}>{prefix}</span>
      )}
      <input
        type={type}
        value={focused ? buffer : value ?? ''}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          setFocused(false);
          onChange?.(e);
        }}
        onChange={(e) => {
          setBuffer(e.target.value);
          onChange?.(e);
        }}
        style={{
          width: width || 80,
          padding: '4px 8px',
          fontFamily: T.fontD,
          fontSize: 14,
          fontWeight: 600,
          color: T.navy,
          border: '1.5px solid #D5DDE3',
          borderRadius: 6,
          outline: 'none',
          background: '#fff',
          textAlign: align,
        }}
      />
      {suffix && (
        <span style={{ fontFamily: T.fontD, color: T.fgMuted }}>{suffix}</span>
      )}
    </span>
  );
};

// ============================================================================
// ParamCell — stacked label/value cell used in the service-card param grid.
// CRITICAL: this is the stacked layout that fixes the "appointment label
// collides with the value" bug from the old space-between row pattern.
// ============================================================================
interface ParamCellProps {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
}
export const ParamCell: React.FC<ParamCellProps> = ({ label, value, hint }) => (
  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
    <span
      style={{
        fontFamily: T.fontUi,
        fontWeight: 700,
        fontSize: 11,
        color: T.fgMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        marginBottom: 4,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {label}
    </span>
    <span
      style={{
        fontFamily: T.fontD,
        fontWeight: 600,
        fontSize: 16,
        color: T.navy,
        letterSpacing: '-.01em',
        whiteSpace: 'nowrap',
      }}
    >
      {value}
    </span>
    {hint && (
      <span style={{ fontFamily: T.fontD, fontSize: 12, color: T.fgMuted, marginTop: 2 }}>
        {hint}
      </span>
    )}
  </div>
);

// ============================================================================
// MiniStat — label/value tile used in hero / location summaries
// ============================================================================
type StatAccent = 'aqua' | 'coral' | 'neutral' | 'navy';
const STAT_ACCENT_BG: Record<StatAccent, string> = {
  aqua: 'var(--pv-aqua)',
  coral: 'rgba(255,80,80,.12)',
  neutral: 'var(--pv-light-gray)',
  navy: 'rgba(9,54,79,.06)',
};
interface MiniStatProps {
  label: React.ReactNode;
  value: React.ReactNode;
  accent?: StatAccent;
}
export const MiniStat: React.FC<MiniStatProps> = ({ label, value, accent = 'neutral' }) => {
  const bg = STAT_ACCENT_BG[accent];
  const valueColor = accent === 'coral' ? T.coral : T.navy;
  return (
    <div
      style={{
        // Horizontal padding shrunk from 16 → 12 so longer eyebrows
        // (APPOINTMENTS = 12 chars × 11px × 0.1em letter-spacing) don't
        // brush the right edge of the box on narrow viewports.
        padding: '14px 12px',
        background: bg,
        borderRadius: 12,
        minWidth: 0,
        // overflow:hidden traps the eyebrow's trailing letter-spacing
        // inside the box even when the label is right at the limit.
        overflow: 'hidden',
      }}
    >
      <Eyebrow
        style={{
          marginBottom: 4,
          // Tighter letter-spacing than the default Eyebrow so longer
          // labels (APPOINTMENTS = 12 chars) fit inside a 120px MiniStat
          // on a 320px viewport without clipping or overflow. Also drop
          // a hair of font-size for the same reason.
          fontSize: 10,
          letterSpacing: '0.06em',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </Eyebrow>
      <div
        style={{
          fontFamily: T.fontD,
          fontWeight: 700,
          fontSize: 20,
          color: valueColor,
          letterSpacing: '-.02em',
          lineHeight: 1.1,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {value}
      </div>
    </div>
  );
};

// ============================================================================
// SectionLabel — eyebrow + heading + optional action button row
// ============================================================================
interface SectionLabelProps {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  action?: React.ReactNode;
  size?: HeadingSize;
  mb?: number;
}
export const SectionLabel: React.FC<SectionLabelProps> = ({
  eyebrow,
  title,
  action,
  size = 'card',
  mb = 16,
}) => {
  const isCompact = useIsCompact();
  return (
    <div
      style={{
        display: 'flex',
        // Phones: stack the action under the title so a long eyebrow
        // label doesn't get wedged against a multi-line section title.
        flexDirection: isCompact ? 'column' : 'row',
        alignItems: isCompact ? 'flex-start' : 'flex-end',
        justifyContent: 'space-between',
        marginBottom: mb,
        gap: isCompact ? 8 : 16,
      }}
    >
      <div>
        {eyebrow && <Eyebrow style={{ marginBottom: 6 }}>{eyebrow}</Eyebrow>}
        <CardHeading size={size}>{title}</CardHeading>
      </div>
      {action}
    </div>
  );
};

// ============================================================================
// CollapseHead — expand/collapse button for Location/Date headers
// ============================================================================
interface CollapseHeadProps {
  open: boolean;
  onClick: () => void;
  left: React.ReactNode;
  right?: React.ReactNode;
}
export const CollapseHead: React.FC<CollapseHeadProps> = ({ open, onClick, left, right }) => {
  const isCompact = useIsCompact();
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: isCompact ? '14px 16px' : '18px 22px',
        background: 'transparent',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 16,
        display: 'flex',
        // Phones: stack the right-rail stats below the title so a multi-
        // stat right cluster doesn't shove the title off-screen.
        flexDirection: isCompact ? 'column' : 'row',
        alignItems: isCompact ? 'stretch' : 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        textAlign: 'left',
        gap: isCompact ? 8 : 12,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: open ? T.aqua : T.lightGray,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transform: open ? 'rotate(0deg)' : 'rotate(-90deg)',
            transition: 'transform .2s',
          }}
        >
          <ChevronDown size={16} color={T.navy} strokeWidth={2.5} />
        </div>
        <div style={{ minWidth: 0 }}>{left}</div>
      </div>
      {right && (
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            gap: isCompact ? 8 : 10,
            // Phones: align the stat cluster to the left under the title
            // and allow it to wrap if the operator stacks four stats.
            flexWrap: isCompact ? 'wrap' : 'nowrap',
            paddingLeft: isCompact ? 40 : 0,
          }}
        >
          {right}
        </div>
      )}
    </button>
  );
};

// ============================================================================
// ServiceTypeChip — small colored chip showing the service type
// ============================================================================
interface ServiceTypeChipProps {
  serviceType: string;
}
export const ServiceTypeChip: React.FC<ServiceTypeChipProps> = ({ serviceType }) => {
  const t = SERVICE_CHIP_COLORS[serviceType] || { bg: T.lightGray, color: T.navy };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: t.bg,
        color: t.color,
        padding: '4px 10px',
        borderRadius: 9999,
        fontFamily: T.fontUi,
        fontWeight: 700,
        fontSize: 11,
        textTransform: 'uppercase',
        letterSpacing: '.1em',
      }}
    >
      {SERVICE_DISPLAY[serviceType] || serviceType}
    </span>
  );
};

// ============================================================================
// ToggleSwitch — include/exclude toggle. Green = on, gray = off.
// ============================================================================
interface ToggleSwitchProps {
  on: boolean;
  onChange?: (next: boolean) => void;
  label?: React.ReactNode;
  size?: 'sm' | 'md';
  disabled?: boolean;
}
export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  on,
  onChange,
  label,
  size = 'sm',
  disabled,
}) => {
  const w = size === 'sm' ? 32 : 40;
  const h = size === 'sm' ? 18 : 22;
  const dot = size === 'sm' ? 14 : 18;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange && onChange(!on)}
      aria-pressed={on}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        background: 'transparent',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        padding: 0,
        fontFamily: T.fontUi,
        fontWeight: 700,
        fontSize: 12,
        color: on ? T.navy : T.fgMuted,
        letterSpacing: '.02em',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span
        style={{
          position: 'relative',
          display: 'inline-block',
          width: w,
          height: h,
          borderRadius: 9999,
          background: on ? T.success : '#D5DDE3',
          transition: 'background .2s',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: on ? w - dot - 2 : 2,
            width: dot,
            height: dot,
            borderRadius: '50%',
            background: '#fff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            transition: 'left .2s',
          }}
        />
      </span>
      {label && <span style={{ whiteSpace: 'nowrap' }}>{label}</span>}
    </button>
  );
};

// ============================================================================
// FrequencyPicker — dropdown for events/year. Includes presets + "Custom…"
// per user requirement #2: "Add a custom entry too."
// ============================================================================
interface FrequencyPickerProps {
  value: number;
  onChange?: (next: number) => void;
  compact?: boolean;
  disabled?: boolean;
  /** Hide the inline clock + "Repeats" prefix so the pill shows just the
   *  selected value (used by the mobile card, which has its own left label). */
  hideLabel?: boolean;
}
/** Recurring volume-discount % for a given events/year count. Mirrors
 *  calculateRecurringDiscount in proposalGenerator (≥9 → 20%, ≥4 → 15%). */
export const freqDiscount = (occurrences: number): number =>
  occurrences >= 9 ? 20 : occurrences >= 4 ? 15 : 0;

export const FrequencyPicker: React.FC<FrequencyPickerProps> = ({
  value,
  onChange,
  compact,
  disabled,
  hideLabel,
}) => {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  // Fixed-position coords for the portaled menu, so it is never clipped by the
  // service card's `overflow:hidden` (the reason mobile previously used a
  // native <select>). Computed from the trigger on open.
  const [coords, setCoords] = useState<{ top: number; left: number; minWidth: number } | null>(null);

  const openPicker = () => {
    const r = triggerRef.current?.getBoundingClientRect();
    if (r) {
      const menuW = Math.max(220, r.width);
      // Keep the menu on-screen if the trigger sits near the right edge.
      const left = Math.min(r.left, window.innerWidth - menuW - 8);
      setCoords({ top: r.bottom + 4, left: Math.max(8, left), minWidth: menuW });
    }
    setOpen(true);
  };

  // Close on outside-click (checking both the trigger and the portaled menu)
  // and on scroll/resize (fixed coords would otherwise drift from the trigger).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || popoverRef.current?.contains(t)) return;
      setOpen(false);
      setCustomMode(false);
    };
    const onDismiss = () => {
      setOpen(false);
      setCustomMode(false);
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onDismiss, true);
    window.addEventListener('resize', onDismiss);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onDismiss, true);
      window.removeEventListener('resize', onDismiss);
    };
  }, [open]);

  const presetMatch = FREQ_OPTIONS.find((o) => o.value === value);
  const label = presetMatch ? presetMatch.label : `${value}× / year`;
  const selDiscount = freqDiscount(value);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openPicker())}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: compact ? '6px 10px' : '8px 12px',
          background: '#fff',
          border: '1.5px solid #D5DDE3',
          borderRadius: 9999,
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontFamily: T.fontUi,
          fontWeight: 700,
          fontSize: 13,
          color: T.navy,
          whiteSpace: 'nowrap',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        {!hideLabel && <Clock size={13} color={T.fgMuted} />}
        {!hideLabel && (
          <span
            style={{
              color: T.fgMuted,
              fontWeight: 600,
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '.06em',
            }}
          >
            Repeats
          </span>
        )}
        <span style={{ color: T.navy }}>{label}</span>
        {selDiscount > 0 && (
          <span
            style={{
              fontFamily: T.fontUi,
              fontWeight: 700,
              fontSize: 11,
              color: T.success,
              background: 'rgba(30,158,106,0.12)',
              borderRadius: 9999,
              padding: '1px 7px',
            }}
          >
            {selDiscount}% off
          </span>
        )}
        <ChevronDown size={13} color={T.fgMuted} />
      </button>
      {open && coords && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            zIndex: 1000,
            background: '#fff',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 12,
            boxShadow: '0 12px 32px rgba(0,0,0,0.16)',
            padding: 4,
            minWidth: coords.minWidth,
          }}
        >
          {!customMode ? (
            <>
              {FREQ_OPTIONS.map((o) => {
                const d = freqDiscount(o.value);
                return (
                <button
                  type="button"
                  key={o.value}
                  onClick={() => {
                    onChange && onChange(o.value);
                    setOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 10,
                    width: '100%',
                    padding: '9px 10px',
                    background: o.value === value ? T.lightGray : 'transparent',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: T.fontUi,
                    fontWeight: 700,
                    fontSize: 13,
                    color: T.navy,
                  }}
                >
                  <span>{o.label}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    {d > 0 && (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: T.success,
                          background: 'rgba(30,158,106,0.12)',
                          borderRadius: 9999,
                          padding: '1px 7px',
                        }}
                      >
                        {d}% off
                      </span>
                    )}
                    {o.value === value && <Check size={13} color={T.coral} strokeWidth={3} />}
                  </span>
                </button>
                );
              })}
              <button
                type="button"
                onClick={() => setCustomMode(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  padding: '8px 10px',
                  background: !presetMatch ? T.lightGray : 'transparent',
                  border: 'none',
                  borderRadius: 8,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: T.fontUi,
                  fontWeight: 700,
                  fontSize: 13,
                  color: T.navy,
                  borderTop: '1px solid rgba(0,0,0,0.05)',
                  marginTop: 4,
                  paddingTop: 10,
                }}
              >
                <span>Custom…</span>
                {!presetMatch && (
                  <span style={{ color: T.fgMuted, fontWeight: 500 }}>{value}×</span>
                )}
              </button>
            </>
          ) : (
            <div style={{ padding: '8px 10px' }}>
              <Eyebrow style={{ marginBottom: 6 }}>Custom frequency</Eyebrow>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number"
                  min={1}
                  max={52}
                  autoFocus
                  defaultValue={value}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const v = Math.max(1, Math.min(52, parseInt(e.currentTarget.value) || 1));
                      onChange && onChange(v);
                      setOpen(false);
                      setCustomMode(false);
                    }
                  }}
                  onBlur={(e) => {
                    const v = Math.max(1, Math.min(52, parseInt(e.target.value) || 1));
                    onChange && onChange(v);
                  }}
                  style={{
                    width: 70,
                    padding: '6px 8px',
                    border: '1.5px solid #D5DDE3',
                    borderRadius: 6,
                    fontFamily: T.fontD,
                    fontSize: 14,
                    fontWeight: 600,
                    color: T.navy,
                  }}
                />
                <span style={{ fontFamily: T.fontD, fontSize: 13, color: T.fgMuted }}>
                  / year
                </span>
              </div>
              <div style={{ fontFamily: T.fontD, fontSize: 12, color: T.fgMuted, marginTop: 6 }}>
                4+ events / year = 15% off · 9+ = 20% off. Press enter to apply.
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

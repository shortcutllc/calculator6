import React, { useState, useRef, useEffect } from 'react';
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
  height = 160,
  width = '100%',
  style,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const photo = SERVICE_IMAGE_PATH[serviceType];
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
          background: g.bg,
          ...style,
        }}
      >
        <img
          src={photo}
          alt=""
          onError={() => setImgFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
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
        value={value ?? ''}
        onChange={onChange}
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
        padding: '14px 16px',
        background: bg,
        borderRadius: 12,
        minWidth: 0,
      }}
    >
      <Eyebrow style={{ marginBottom: 4 }}>{label}</Eyebrow>
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
}
export const FrequencyPicker: React.FC<FrequencyPickerProps> = ({
  value,
  onChange,
  compact,
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close popover on outside-click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setCustomMode(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const presetMatch = FREQ_OPTIONS.find((o) => o.value === value);
  const label = presetMatch ? presetMatch.label : `${value}× / year`;

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: compact ? '6px 10px' : '8px 12px',
          background: '#fff',
          border: '1.5px solid #D5DDE3',
          borderRadius: 10,
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontFamily: T.fontUi,
          fontWeight: 700,
          fontSize: 13,
          color: T.navy,
          whiteSpace: 'nowrap',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <Clock size={13} color={T.fgMuted} />
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
        <span style={{ color: T.navy }}>{label}</span>
        <ChevronDown size={13} color={T.fgMuted} />
      </button>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 20,
            background: '#fff',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            padding: 4,
            minWidth: 200,
          }}
        >
          {!customMode ? (
            <>
              {FREQ_OPTIONS.map((o) => (
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
                    width: '100%',
                    padding: '8px 10px',
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
                  {o.value === value && <Check size={13} color={T.coral} strokeWidth={3} />}
                </button>
              ))}
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
                Press enter or click outside to apply.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

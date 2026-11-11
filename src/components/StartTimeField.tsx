import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { T } from './proposal/shared/primitives';
import {
  startWindows,
  formatClock,
  formatWindow,
  formatDuration,
  formatDateKey,
  addHours,
  isClock,
  type SurveyEventSlot,
} from '../../netlify/functions/lib/survey-start-times.js';

// "What time would you like us to start?" in the post-approval survey
// (ProposalSurveyForm). One explicit choice per picker: a time window our
// clients book most for an event of this length (survey-start-times.js has
// the study), or "Pick my own start time", which opens a time box. A line
// under the choices says exactly when we will start and finish.
// Multi-day proposals first ask whether every day starts at the same time.
//
// Drawn in the V2 proposal language: T tokens, Outfit, and the same
// pick-one tile as the guest-count options (PricingOptionsSelector): white,
// 12px radius, coral border and coral check when chosen.

const question: React.CSSProperties = {
  display: 'block',
  fontFamily: T.fontD,
  fontWeight: 700,
  fontSize: 15,
  lineHeight: 1.3,
  color: T.navy,
  margin: 0,
};

const help: React.CSSProperties = {
  fontFamily: T.fontD,
  fontSize: 13,
  lineHeight: 1.5,
  color: T.fgMuted,
  margin: '4px 0 12px',
};

const Tile: React.FC<{
  on: boolean;
  onClick: () => void;
  title: string;
  sub?: string;
  wide?: boolean;
}> = ({ on, onClick, title, sub, wide }) => (
  <button
    type="button"
    role="radio"
    aria-checked={on}
    onClick={onClick}
    style={{
      gridColumn: wide ? '1 / -1' : undefined,
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 8,
      minWidth: 0,
      textAlign: 'left',
      cursor: 'pointer',
      background: '#fff',
      border: on ? `2px solid ${T.coral}` : '1.5px solid rgba(0,0,0,0.08)',
      borderRadius: 12,
      padding: on ? '11.5px 13.5px' : '12px 14px',
      boxShadow: on ? '0 4px 12px rgba(255,80,80,.12)' : 'none',
      transition: 'border-color .2s, box-shadow .2s',
    }}
  >
    <span style={{ minWidth: 0 }}>
      <span
        style={{
          display: 'block',
          fontFamily: T.fontD,
          fontWeight: 700,
          fontSize: 15,
          lineHeight: 1.25,
          letterSpacing: '-.01em',
          color: T.navy,
        }}
      >
        {title}
      </span>
      {sub && (
        <span style={{ display: 'block', marginTop: 3, fontFamily: T.fontD, fontSize: 12, color: T.fgMuted }}>
          {sub}
        </span>
      )}
    </span>
    <span
      aria-hidden
      style={{
        width: 18,
        height: 18,
        marginTop: 1,
        borderRadius: '50%',
        border: on ? 'none' : '2px solid #D1D5DB',
        background: on ? T.coral : 'transparent',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
      }}
    >
      {on && <Check size={11} strokeWidth={3} />}
    </span>
  </button>
);

/** "We'll start at 10 AM and finish at 3 PM on all 4 days." */
const Confirm: React.FC<{ start: string; hours: number; daysNote?: string }> = ({ start, hours, daysNote }) => (
  <p
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 8,
      margin: '12px 0 0',
      fontFamily: T.fontD,
      fontSize: 14,
      lineHeight: 1.4,
      fontWeight: 600,
      color: T.navy,
    }}
  >
    <Check size={16} strokeWidth={3} color="#1E9E6A" aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
    <span>
      We'll start at {formatClock(start)} and finish at {formatClock(addHours(start, hours))}
      {daysNote}.
    </span>
  </p>
);

const TimePicker: React.FC<{
  id: string;
  ariaLabel: string;
  hours: number;
  value: string;
  onChange: (value: string) => void;
  /** " on all 4 days" when one time covers several days. */
  daysNote?: string;
}> = ({ id, ariaLabel, hours, value, onChange, daysNote }) => {
  const windows = startWindows(hours);
  // "Pick my own start time" is open when the client chose it, or when a
  // saved time is not one of the windows.
  const [own, setOwn] = useState(() => isClock(value) && !windows.some((w) => w.start === value));
  return (
    <div>
      {/* Same grid rule as the guest-count option tiles: columns follow the
          container, so the narrow desktop survey column gets two and a
          phone gets one, and a time never breaks mid-phrase. */}
      <div
        role="radiogroup"
        aria-label={ariaLabel}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}
      >
        {windows.map((w) => (
          <Tile
            key={w.start}
            on={!own && value === w.start}
            onClick={() => {
              setOwn(false);
              onChange(w.start);
            }}
            title={formatWindow(w.start, hours)}
            sub={w.most ? 'Most popular' : undefined}
          />
        ))}
        <Tile
          wide
          on={own}
          onClick={() => {
            if (own) return;
            setOwn(true);
            onChange('');
          }}
          title="Pick my own start time"
          sub="Enter any time that works for your team."
        />
      </div>

      {own && (
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
          <label htmlFor={id} style={{ fontFamily: T.fontD, fontWeight: 600, fontSize: 14, color: T.navy }}>
            Your start time
          </label>
          <input
            id={id}
            type="time"
            step={900}
            value={isClock(value) ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            style={{
              fontFamily: T.fontD,
              fontSize: 15,
              fontWeight: 600,
              color: T.navy,
              background: '#fff',
              border: `2px solid ${T.coral}`,
              borderRadius: 10,
              padding: '7.5px 11.5px',
            }}
          />
        </div>
      )}

      {isClock(value) ? (
        <Confirm start={value} hours={hours} daysNote={daysNote} />
      ) : own ? (
        <p style={{ ...help, margin: '8px 0 0' }}>Enter the time you'd like us to start.</p>
      ) : null}
    </div>
  );
};

interface Props {
  slots: SurveyEventSlot[];
  /** Start time per slot key, "HH:MM". */
  value: Record<string, string>;
  onChange: (next: Record<string, string>) => void;
  perDay: boolean;
  onPerDayChange: (perDay: boolean) => void;
}

const StartTimeField: React.FC<Props> = ({ slots, value, onChange, perDay, onPerDayChange }) => {
  if (!slots.length) return null;
  const days = slots.length;
  const sameLength = new Set(slots.map((s) => s.hours)).size === 1;
  const multiLoc = new Set(slots.map((s) => s.location)).size > 1;
  const askSameTime = days > 1 && sameLength;
  const eachDay = days > 1 && (perDay || !sameLength);
  const first = slots[0];
  const localNote = multiLoc ? ' Use the local time at each office.' : '';

  const setAll = (clock: string) => onChange(Object.fromEntries(slots.map((s) => [s.key, clock])));
  const setOne = (key: string, clock: string) => onChange({ ...value, [key]: clock });
  const useOneTime = () => {
    if (!perDay) return;
    setAll(slots.map((s) => value[s.key]).find(isClock) || '');
    onPerDayChange(false);
  };

  return (
    <div>
      {askSameTime && (
        <div style={{ marginBottom: 22 }}>
          <p style={question}>Will every day start at the same time?</p>
          <p style={help}>Your event runs on {days} days.</p>
          <div
            role="radiogroup"
            aria-label="Will every day start at the same time?"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}
          >
            <Tile on={!perDay} onClick={useOneTime} title="Yes, the same time every day" />
            <Tile on={perDay} onClick={() => onPerDayChange(true)} title="No, a different time each day" />
          </div>
        </div>
      )}

      {eachDay ? (
        <>
          <p style={question}>What time would you like us to start each day?</p>
          <p style={help}>
            {sameLength
              ? `Each day runs ${formatDuration(first.hours)}.`
              : 'Your days run different lengths, so each day has its own time windows.'}{' '}
            For each day, pick one of the time windows or pick your own start time.{localNote}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {slots.map((slot) => {
              const dayName = `${multiLoc ? `${slot.location}, ` : ''}${formatDateKey(slot.date)}`;
              return (
                <div
                  key={slot.key}
                  style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 16, padding: 16 }}
                >
                  <p style={{ ...question, marginBottom: 10 }}>
                    {dayName}
                    <span style={{ fontWeight: 400, color: T.fgMuted }}> ({formatDuration(slot.hours)})</span>
                  </p>
                  <TimePicker
                    id={`start-time-${slot.key}`}
                    ariaLabel={`Start time for ${dayName}`}
                    hours={slot.hours}
                    value={value[slot.key] || ''}
                    onChange={(clock) => setOne(slot.key, clock)}
                  />
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          <p style={question}>What time would you like us to start?</p>
          <p style={help}>
            {days > 1 ? 'Each day' : 'Your event'} runs {formatDuration(first.hours)}. Pick one of the
            time windows below, or pick your own start time.
            {days > 1 && ` We'll use the same time for all ${days} days.`}
            {localNote}
          </p>
          <TimePicker
            id="start-time"
            ariaLabel="What time would you like us to start?"
            hours={first.hours}
            value={value[first.key] || ''}
            onChange={setAll}
            daysNote={days > 1 ? ` on all ${days} days` : undefined}
          />
        </>
      )}
    </div>
  );
};

export default StartTimeField;

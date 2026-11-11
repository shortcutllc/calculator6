import React from 'react';
import { Check } from 'lucide-react';
import { T } from './proposal/shared/primitives';
import {
  startWindows,
  formatWindow,
  formatDuration,
  formatDateKey,
  isClock,
  type SurveyEventSlot,
} from '../../netlify/functions/lib/survey-start-times.js';

// "Start time" in the post-approval survey (ProposalSurveyForm). The tiles are
// the windows our clients book most for an event of this length
// (survey-start-times.js has the study); the time box takes any other start.
// One picker covers every day unless the days differ in length or the client
// asks to set each day on its own.
//
// Drawn in the V2 proposal language: T tokens, Outfit, and the same
// pick-one tile as the guest-count options (PricingOptionsSelector): white,
// 12px radius, coral border and coral check when chosen.

const label: React.CSSProperties = {
  display: 'block',
  fontFamily: T.fontD,
  fontWeight: 600,
  fontSize: 14,
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

const TimePicker: React.FC<{
  id: string;
  hours: number;
  value: string;
  onChange: (value: string) => void;
}> = ({ id, hours, value, onChange }) => {
  const windows = startWindows(hours);
  const custom = isClock(value) && !windows.some((w) => w.start === value);
  return (
    <div>
      {/* Same grid rule as the guest-count option tiles: columns follow the
          container, so the narrow desktop survey column gets two and a
          phone gets one, and a time never breaks mid-phrase. */}
      <div
        role="radiogroup"
        aria-label="Start time"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}
      >
        {windows.map((w) => {
          const on = value === w.start;
          return (
            <button
              key={w.start}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(on ? '' : w.start)}
              style={{
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
                  {formatWindow(w.start, hours)}
                </span>
                {w.most && (
                  <span
                    style={{
                      display: 'block',
                      marginTop: 3,
                      fontFamily: T.fontD,
                      fontSize: 12,
                      color: T.fgMuted,
                    }}
                  >
                    Most popular
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
        })}
      </div>
      <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <label htmlFor={id} style={{ fontFamily: T.fontD, fontWeight: 600, fontSize: 13, color: T.navy }}>
          Or enter a start time
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
            border: custom ? `2px solid ${T.coral}` : '1.5px solid rgba(0,0,0,0.1)',
            borderRadius: 10,
            padding: custom ? '7.5px 11.5px' : '8px 12px',
          }}
        />
      </div>
      {custom && (
        <p style={{ ...help, margin: '8px 0 0' }}>Your event would run from {formatWindow(value, hours)}.</p>
      )}
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
  const sameLength = new Set(slots.map((s) => s.hours)).size === 1;
  const multiLoc = new Set(slots.map((s) => s.location)).size > 1;
  const eachDay = perDay || !sameLength;
  const first = slots[0];
  const days = slots.length;

  const setAll = (clock: string) => onChange(Object.fromEntries(slots.map((s) => [s.key, clock])));
  const setOne = (key: string, clock: string) => onChange({ ...value, [key]: clock });

  const switchToOneTime = () => {
    const shared = slots.map((s) => value[s.key]).find(isClock) || '';
    setAll(shared);
    onPerDayChange(false);
  };

  return (
    <div>
      <p style={label}>Start time</p>
      {eachDay ? (
        <p style={help}>
          Pick a start time for each day. The tiles show the windows our clients choose most often
          for an event that long, or you can enter a different time.
          {multiLoc && ' Times are local to each office.'}
        </p>
      ) : (
        <p style={help}>
          Your event runs {formatDuration(first.hours)}
          {days > 1 ? ' each day' : ''}. These are the windows our clients choose most often for
          an event that long. Pick one, or enter a different start time.
          {days > 1 && ` We'll use the same start time for all ${days} days.`}
          {multiLoc && ' Times are local to each office.'}
        </p>
      )}

      {eachDay ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {slots.map((slot) => (
            <div
              key={slot.key}
              style={{
                background: '#fff',
                border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: 16,
                padding: 16,
              }}
            >
              <p style={{ ...label, fontWeight: 700, fontSize: 15, marginBottom: 10 }}>
                {multiLoc ? `${slot.location}, ` : ''}
                {formatDateKey(slot.date)}
                <span style={{ fontWeight: 400, color: T.fgMuted }}> ({formatDuration(slot.hours)})</span>
              </p>
              <TimePicker
                id={`start-time-${slot.key}`}
                hours={slot.hours}
                value={value[slot.key] || ''}
                onChange={(clock) => setOne(slot.key, clock)}
              />
            </div>
          ))}
        </div>
      ) : (
        <TimePicker id="start-time" hours={first.hours} value={value[first.key] || ''} onChange={setAll} />
      )}

      {days > 1 && sameLength && (
        <button
          type="button"
          onClick={() => (perDay ? switchToOneTime() : onPerDayChange(true))}
          style={{
            marginTop: 12,
            fontFamily: T.fontUi,
            fontWeight: 700,
            fontSize: 13,
            color: T.navy,
            background: 'transparent',
            border: '1.5px solid rgba(0,55,86,0.2)',
            borderRadius: 10,
            padding: '8px 14px',
            cursor: 'pointer',
          }}
        >
          {perDay ? 'Use one start time for every day' : 'Set a different time for each day'}
        </button>
      )}
    </div>
  );
};

export default StartTimeField;

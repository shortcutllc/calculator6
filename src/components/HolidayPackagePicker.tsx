import React, { useMemo, useState } from 'react';
import { Gift } from 'lucide-react';
import { Button } from './Button';
import {
  HOLIDAY_PACKAGES,
  getHolidayPackage,
  holidayServices,
  quoteHolidayPackage,
  HolidayPackageError,
} from '../../netlify/functions/lib/holiday-packages.js';
import type { HolidayQuote } from '../../netlify/functions/lib/holiday-packages.js';

// The staff calculator's holiday package picker (Create New Proposal → Add
// Event). Pick a package from www.getshortcut.co/holiday, the headcount and
// the date, and the event fills with that package's services, staffed and
// priced exactly as the page prices them (netlify/functions/lib/
// holiday-packages.js). The proposal then carries the package's offer.

export interface HolidayChoice {
  packageId: string;
  headcount: number;
}

interface Props {
  location: string;
  /** The event's new services (date and location set) and the package picked. */
  onApply: (services: Record<string, any>[], choice: HolidayChoice) => void;
}

const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

const HolidayPackagePicker: React.FC<Props> = ({ location, onApply }) => {
  const [packageId, setPackageId] = useState('');
  const [headcount, setHeadcount] = useState('');
  const [date, setDate] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [classMinutes, setClassMinutes] = useState(30);

  const pkg = packageId ? getHolidayPackage(packageId) : null;
  const people = Number(headcount);
  const hasClass = !!pkg && (pkg.custom
    ? pkg.lines.some((l) => l.group && picked.includes(l.key))
    : pkg.lines.some((l) => l.group));

  const result = useMemo((): { quote?: HolidayQuote; error?: string } => {
    if (!pkg || !(people > 0)) return {};
    try {
      return { quote: quoteHolidayPackage({ packageId: pkg.id, headcount: people, services: pkg.custom ? picked : undefined, classMinutes }) };
    } catch (e) {
      if (e instanceof HolidayPackageError) return { error: e.message };
      throw e;
    }
  }, [pkg, people, picked, classMinutes]);

  const apply = () => {
    if (!pkg || !result.quote || !date) return;
    const services = holidayServices({ packageId: pkg.id, headcount: people, services: pkg.custom ? picked : undefined, classMinutes })
      .map((s) => ({ ...s, date, location, discountPercent: 0 }));
    onApply(services, { packageId: pkg.id, headcount: people });
  };

  const field = 'w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-shortcut-teal focus:border-shortcut-teal';

  return (
    <div className="mb-8 p-5 bg-white rounded-[24px] border-2 border-shortcut-teal/30">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-shortcut-teal/20 rounded-full flex items-center justify-center flex-shrink-0">
          <Gift size={20} className="text-shortcut-blue" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-shortcut-blue">Holiday package</h3>
          <p className="text-sm text-text-dark-60 font-medium">
            Fills this event with a package from the holiday page, priced the way the page prices it.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <label className="block">
          <span className="block text-shortcut-blue text-sm font-bold mb-2">Package</span>
          <select value={packageId} onChange={(e) => setPackageId(e.target.value)} className={field}>
            <option value="">Choose a package</option>
            {HOLIDAY_PACKAGES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.custom ? p.name : `${p.name} (${p.inside})`}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="block text-shortcut-blue text-sm font-bold mb-2">People</span>
          <input type="number" min={1} value={headcount} onChange={(e) => setHeadcount(e.target.value)} placeholder="50" className={field} />
        </label>
        <label className="block">
          <span className="block text-shortcut-blue text-sm font-bold mb-2">Date</span>
          <div className="flex items-center gap-3">
            <input
              type="date"
              value={date === 'TBD' ? '' : date}
              disabled={date === 'TBD'}
              onChange={(e) => e.target.value && setDate(e.target.value)}
              className={`${field} ${date === 'TBD' ? 'bg-neutral-light-gray text-text-dark-60' : ''}`}
            />
            <span className="flex items-center gap-2 text-sm font-bold text-shortcut-blue">
              <input type="checkbox" checked={date === 'TBD'} onChange={(e) => setDate(e.target.checked ? 'TBD' : '')} className="w-4 h-4" />
              TBD
            </span>
          </div>
        </label>
      </div>

      {pkg?.custom && (
        <div className="mt-4">
          <span className="block text-shortcut-blue text-sm font-bold mb-2">Services</span>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {pkg.lines.map((l) => (
              <label key={l.key} className="flex items-center gap-2 text-sm font-medium text-shortcut-blue">
                <input
                  type="checkbox"
                  checked={picked.includes(l.key)}
                  onChange={(e) => setPicked((p) => (e.target.checked ? [...p, l.key] : p.filter((k) => k !== l.key)))}
                  className="w-4 h-4"
                />
                {l.label}
              </label>
            ))}
          </div>
        </div>
      )}

      {hasClass && (
        <label className="block mt-4 max-w-xs">
          <span className="block text-shortcut-blue text-sm font-bold mb-2">Class length</span>
          <select value={classMinutes} onChange={(e) => setClassMinutes(Number(e.target.value))} className={field}>
            <option value={30}>30 minutes</option>
            <option value={60}>60 minutes</option>
          </select>
        </label>
      )}

      {result.error && <p className="mt-4 text-sm font-medium text-red-700">{result.error}</p>}
      {result.quote && (
        <div className="mt-4 p-4 rounded-lg bg-neutral-light-gray text-sm text-shortcut-blue">
          <p className="font-bold">
            {money(result.quote.total)} for {result.quote.headcount} people, {result.quote.hours} hours on site
          </p>
          <p className="mt-1 text-text-dark-60 font-medium">
            {result.quote.lines.map((l) => `${l.name}${l.pros ? ` (${l.pros} Pro${l.pros === 1 ? '' : 's'})` : ''} ${money(l.cost)}`).join(' + ')}
            {result.quote.savings ? `, less ${money(result.quote.savings)} combine and save (${result.quote.combinePercent}%)` : ''}.
            {' '}The proposal also shows the free {result.quote.freeClass.minutes} minute class ({money(result.quote.freeClass.value)} value) and the holiday treat.
          </p>
        </div>
      )}

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={apply} variant="primary" disabled={!result.quote || !date}>
          Use this package
        </Button>
        <span className="text-xs text-text-dark-60 font-medium">Replaces the services below.</span>
      </div>
    </div>
  );
};

export default HolidayPackagePicker;

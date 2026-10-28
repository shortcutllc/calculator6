import React from 'react';
import { Gift } from 'lucide-react';
import type { HolidayPackageRecord } from '../../../netlify/functions/lib/holiday-packages.js';

// The holiday package callout on the client view. It takes the place of the
// "commit to 4 events a year" volume banner on a holiday package proposal
// (data.holidayPackage), in the same .pv-savings / .pvm-savings skin. The
// offer sentence is the www holiday page's own FAQ answer, word for word, and
// its figures come from the proposal's snapshot of the offer, so a proposal
// keeps the terms it was sent with.

const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

interface Props {
  pkg: HolidayPackageRecord;
  /** True while combine-and-save is in the price (two or more services). */
  saving: boolean;
  /** Mobile tree (.pvm-savings) or desktop (.pv-savings). */
  compact?: boolean;
}

const HolidayPackageBanner: React.FC<Props> = ({ pkg, saving, compact = false }) => {
  const pct = pkg.combinePercent || 10;
  const free = pkg.freeClass || { minutes: 30, value: 1250, useBy: 'March 2027' };
  const savings = pkg.custom
    ? saving
      ? <>Combining two or more services <strong>saves {pct}%</strong>.</>
      : <>Add one more service to <strong>save {pct}%</strong>.</>
    : saving
    ? <>This package <strong>saves {pct}%</strong>.</>
    : null;
  return (
    <div className={compact ? 'pvm-savings' : 'pv-savings'} style={compact ? undefined : { marginBottom: 0 }}>
      <Gift aria-hidden strokeWidth={compact ? 1.6 : 2.2} />
      <span className={compact ? 't' : 'txt'}>
        <strong style={{ color: 'inherit' }}>{pkg.name}</strong>
        {pkg.custom ? '.' : <> · {pkg.inside}.</>} {savings}{savings ? ' ' : ''}
        Every holiday booking also gets a free {free.minutes} minute group mind or body class, a{' '}
        {money(free.value)} value, on site or virtual, to use by {free.useBy}
        {pkg.treat ? ', and all packages come with a special holiday treat.' : '.'}
      </span>
    </div>
  );
};

export default HolidayPackageBanner;

// Types for holiday-packages.js, so the staff calculator and the client
// viewer (TypeScript) share the one implementation Pro and the API use.

export const HOLIDAY_SEASON: string;
export const VISIT_HOURS: number;
export const APPT_RATE: number;
export const HEADSHOT_RATE: number;
export const HEADSHOT_RETOUCH: number;
export const COMBINE_PCT: number;
export const FREE_CLASS: { minutes: number; value: number; useBy: string };
export const COMBINED_SERVICE_TYPES: Record<string, number>;

export interface HolidayPackageLine {
  key: string;
  label: string;
  minutes: number;
  group?: boolean;
}

export interface HolidayPackage {
  id: string;
  name: string;
  inside: string;
  custom?: boolean;
  lines: HolidayPackageLine[];
}

export interface HolidayPackageInput {
  packageId: string;
  headcount: number;
  /** Create Your Own only: line keys or plain names ("massage", "sound bath"). */
  services?: string[];
  /** Group class length, 30 (default) or 60: one number, or per line key. */
  classMinutes?: number | Record<string, number>;
}

export interface HolidayQuote {
  package: { id: string; name: string; inside: string; custom: boolean };
  headcount: number;
  hours: number;
  lines: { key: string; name: string; pros: number; minutes: number; cost: number }[];
  subtotal: number;
  savings: number;
  total: number;
  combinePercent: number;
  freeClass: { minutes: number; value: number; useBy: string };
  treat: boolean;
}

/** What a proposal stores as `data.holidayPackage`. */
export interface HolidayPackageRecord {
  id: string;
  name: string;
  inside: string;
  custom: boolean;
  headcount: number | null;
  season: string;
  combinePercent: number;
  freeClass: { minutes: number; value: number; useBy: string };
  treat: boolean;
}

export const HOLIDAY_PACKAGES: HolidayPackage[];
export class HolidayPackageError extends Error {}
export function comboCount(serviceTypes: string[]): number;
export function getHolidayPackage(ref: string): HolidayPackage | null;
export function prosFor(headcount: number, minutes: number): number;
export function quoteHolidayPackage(input: HolidayPackageInput): HolidayQuote;
export function holidayServices(input: HolidayPackageInput): Record<string, any>[];
export function holidayPackageRecord(input: { packageId: string; headcount: number }): HolidayPackageRecord | null;
export function holidayComboActive(data: any): boolean;
export function holidayComboSavings(
  visits: { serviceTypes: string[]; subtotal: number }[],
  percent?: number
): number;
export function holidaySelectionFrom(services: any[]): { services: string[]; classMinutes: Record<string, number> };
export function holidayPackageMenu(): string;

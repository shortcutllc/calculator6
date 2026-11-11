// Types for survey-start-times.js, shared by the survey, the staff screens and
// the Slack survey alert.

export interface SurveyEventSlot {
  /** `${location}|${date}`, the same key shape as data.optionsState. */
  key: string;
  location: string;
  date: string;
  /** Longest service the client kept that day, rounded to a quarter hour. */
  hours: number;
}

export interface StartWindow {
  start: string;
  end: string;
  /** The single most booked start for this length. */
  most: boolean;
}

export const START_TIMES_KEY: 'start_times';
export function roundHours(hours: unknown): number;
export function isClock(value: unknown): value is string;
export function addHours(clock: string, hours: number): string;
export function formatClock(clock: string): string;
export function formatWindow(start: string, hours: number): string;
export function formatDuration(hours: number): string;
export function startWindows(hours: number): StartWindow[];
export function formatDateKey(raw: string): string;
export function getSurveyEventSlots(data: any): SurveyEventSlot[];
export function readStartTimes(responses: any): Record<string, string>;
export function describeStartTimes(
  startTimes: Record<string, string> | null | undefined,
  slots?: SurveyEventSlot[] | null
): Array<{ label: string; text: string }>;

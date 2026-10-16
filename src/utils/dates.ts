import type { IsoDate } from '../types';

const DAY_MS = 86_400_000;

const toUtc = (d: IsoDate) => Date.parse(`${d}T00:00:00Z`);

export const isIsoDate = (s: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  new Date(toUtc(s)).toISOString().slice(0, 10) === s;

export function today(now = new Date()): IsoDate {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate(),
  )}`;
}

export const addDays = (d: IsoDate, n: number): IsoDate =>
  new Date(toUtc(d) + n * DAY_MS).toISOString().slice(0, 10);

/** Whole days from a to b (b − a). */
export const diffDays = (a: IsoDate, b: IsoDate): number =>
  Math.round((toUtc(b) - toUtc(a)) / DAY_MS);

/** Days in [start, end] ∩ [from, to], inclusive; 0 if no overlap. */
export function overlapDays(
  start: IsoDate,
  end: IsoDate,
  from: IsoDate,
  to: IsoDate,
): number {
  const s = start > from ? start : from;
  const e = end < to ? end : to;
  return s > e ? 0 : diffDays(s, e) + 1;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');

export const weekday = (d: IsoDate) => WEEKDAYS[new Date(toUtc(d)).getUTCDay()];

export function shortDate(d: IsoDate): string {
  const date = new Date(toUtc(d));
  return `${weekday(d)} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

/** "today", "tomorrow", "in 3 days", "2 days ago". */
export function relativeDay(d: IsoDate, from: IsoDate): string {
  const n = diffDays(from, d);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}

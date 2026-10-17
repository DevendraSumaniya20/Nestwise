import { addDays } from './dates.ts';
import type { Id, IsoDate, Member } from './model.ts';
import { isActiveOn } from './settlement.ts';

/** Same day next month(s), clamped to month end (31 Jan + 1 = 28/29 Feb). */
export function addMonths(d: IsoDate, n: number): IsoDate {
  const [y, m, day] = d.split('-').map(Number) as [number, number, number];
  const first = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  first.setUTCDate(Math.min(day, last));
  return first.toISOString().slice(0, 10);
}

/** The next bill period: [1 Oct, 31 Oct] → [1 Nov, 30 Nov]. */
export const nextPeriod = (start: IsoDate, end: IsoDate) => ({
  periodStart: addMonths(start, 1),
  periodEnd: addDays(addMonths(addDays(end, 1), 1), -1),
});

/** Chore rotation: the flatmate after `current` (in move-in order) who still lives here on `on`. */
export function nextAssignee(members: Member[], current: Id, on: IsoDate): Id {
  const here = members.filter(m => m.id === current || isActiveOn(m, on));
  const i = here.findIndex(m => m.id === current);
  const next = here.slice(i + 1).concat(here.slice(0, i)).find(m => isActiveOn(m, on));
  return next?.id ?? current;
}

import { overlapDays } from './dates';
import type { Id, IsoDate, Member, Paise } from '../types';

/** Parses "1,250.50" style rupee input into paise; null if invalid or ≤ 0. */
export function parseRupees(input: string): Paise | null {
  const s = input.replace(/[,₹\s]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const p = Math.round(Number(s) * 100);
  return p > 0 ? p : null;
}

export function formatInr(p: Paise): string {
  const sign = p < 0 ? '−' : '';
  const abs = Math.abs(p);
  const rupees = Math.floor(abs / 100).toLocaleString('en-IN');
  const paise = abs % 100;
  return `${sign}₹${rupees}${paise ? `.${String(paise).padStart(2, '0')}` : ''}`;
}

/**
 * Splits `amount` by integer weights. Leftover paise go to the largest
 * remainders so the parts always sum exactly to `amount`.
 */
export function splitByWeights(
  amount: Paise,
  weights: Record<Id, number>,
): Record<Id, Paise> {
  const ids = Object.keys(weights).filter(id => (weights[id] ?? 0) > 0);
  const total = ids.reduce((s, id) => s + weights[id]!, 0);
  if (total === 0) return {};
  const parts = ids.map(id => {
    const exact = (amount * weights[id]!) / total;
    return { id, base: Math.floor(exact), rem: exact - Math.floor(exact) };
  });
  let left = amount - parts.reduce((s, x) => s + x.base, 0);
  [...parts]
    .sort((a, b) => b.rem - a.rem || a.id.localeCompare(b.id))
    .forEach(x => {
      if (left > 0) {
        x.base += 1;
        left -= 1;
      }
    });
  return Object.fromEntries(parts.map(x => [x.id, x.base]));
}

export const splitEqual = (amount: Paise, ids: Id[]) =>
  splitByWeights(amount, Object.fromEntries(ids.map(id => [id, 1])));

/** Split by days each member lived in the flat during [from, to]. */
export function splitByOccupancy(
  amount: Paise,
  members: Member[],
  from: IsoDate,
  to: IsoDate,
): Record<Id, Paise> {
  return splitByWeights(
    amount,
    Object.fromEntries(
      members.map(m => [
        m.id,
        overlapDays(m.moveIn, m.moveOut ?? '9999-12-31', from, to),
      ]),
    ),
  );
}

import type { Expense, Id, Paise } from '../types';

/** Net per member: positive = the flat owes them, negative = they owe. */
export function netBalances(
  expenses: Expense[],
  memberIds: Id[],
): Record<Id, Paise> {
  const net: Record<Id, Paise> = Object.fromEntries(memberIds.map(id => [id, 0]));
  for (const e of expenses) {
    for (const [id, p] of Object.entries(e.paid)) net[id] = (net[id] ?? 0) + p;
    for (const [id, p] of Object.entries(e.owed)) net[id] = (net[id] ?? 0) - p;
  }
  return net;
}

export type Transfer = { from: Id; to: Id; amount: Paise };

/** Greedy minimal-ish list of payments that zeroes every balance. */
export function settleUp(net: Record<Id, Paise>): Transfer[] {
  const debtors = Object.entries(net)
    .filter(([, v]) => v < 0)
    .map(([id, v]) => ({ id, v: -v }))
    .sort((a, b) => b.v - a.v);
  const creditors = Object.entries(net)
    .filter(([, v]) => v > 0)
    .map(([id, v]) => ({ id, v }))
    .sort((a, b) => b.v - a.v);
  const out: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].v, creditors[j].v);
    out.push({ from: debtors[i].id, to: creditors[j].id, amount });
    debtors[i].v -= amount;
    creditors[j].v -= amount;
    if (debtors[i].v === 0) i++;
    if (creditors[j].v === 0) j++;
  }
  return out;
}

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
    const d = debtors[i]!;
    const c = creditors[j]!;
    const amount = Math.min(d.v, c.v);
    out.push({ from: d.id, to: c.id, amount });
    d.v -= amount;
    c.v -= amount;
    if (d.v === 0) i++;
    if (c.v === 0) j++;
  }
  return out;
}

export type MyShare = { kind: 'lent' | 'borrowed' | 'none'; amount: Paise };

/** Splitwise-style line for one expense from `me`'s point of view. */
export function myShare(e: Expense, me: Id): MyShare {
  const net = (e.paid[me] ?? 0) - (e.owed[me] ?? 0);
  if (net > 0) return { kind: 'lent', amount: net };
  if (net < 0) return { kind: 'borrowed', amount: -net };
  return { kind: 'none', amount: 0 };
}

/** Who owes `me` and whom `me` owes, using the simplified settle-up plan. */
export function myDebts(transfers: Transfer[], me: Id): { other: Id; amount: Paise; owesMe: boolean }[] {
  return transfers
    .filter(t => t.from === me || t.to === me)
    .map(t => ({ other: t.from === me ? t.to : t.from, amount: t.amount, owesMe: t.to === me }));
}

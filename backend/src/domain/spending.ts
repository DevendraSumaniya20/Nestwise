import type { Expense, ExpenseCategory, Id, Paise } from './model.ts';

export type Spending = {
  /** YYYY-MM */
  month: string;
  total: Paise;
  /** Largest first. */
  byCategory: { category: ExpenseCategory; amount: Paise }[];
  /** What each flatmate put in and what their share was this month. */
  byMember: { memberId: Id; paid: Paise; share: Paise }[];
};

/** Flat spending for one month. Settlement payments move money between flatmates, so they are not spending. */
export function spending(expenses: Expense[], month: string): Spending {
  const inMonth = expenses.filter(e => e.category !== 'Settlement' && e.date.startsWith(month));
  const cats = new Map<ExpenseCategory, Paise>();
  const people = new Map<Id, { paid: Paise; share: Paise }>();
  const person = (id: Id) => people.get(id) ?? people.set(id, { paid: 0, share: 0 }).get(id)!;
  for (const e of inMonth) {
    cats.set(e.category, (cats.get(e.category) ?? 0) + e.amount);
    for (const [id, p] of Object.entries(e.paid)) person(id).paid += p;
    for (const [id, p] of Object.entries(e.owed)) person(id).share += p;
  }
  return {
    month,
    total: inMonth.reduce((s, e) => s + e.amount, 0),
    byCategory: [...cats].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
    byMember: [...people].map(([memberId, v]) => ({ memberId, ...v })).sort((a, b) => b.share - a.share),
  };
}

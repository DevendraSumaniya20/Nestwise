import { diffDays, relativeDay, weekday } from '../utils/dates';
import { formatInr } from '../utils/money';
import type { FlatState, Id, IsoDate } from '../types';

export type Reminder = {
  id: string;
  kind: 'grocery' | 'bill' | 'task';
  /** Who should act; undefined = whole flat. */
  for?: Id | undefined;
  title: string;
  detail: string;
  /** Days until due; negative = overdue. */
  inDays: number;
};

/** The "don't let the flat forget" feed, most urgent first. */
export function reminders(s: FlatState, on: IsoDate): Reminder[] {
  const out: Reminder[] = [];
  for (const g of s.groceries) {
    const n = diffDays(on, g.neededBy);
    if (g.bought || n > 1) continue;
    out.push({
      id: `g-${g.id}`,
      kind: 'grocery',
      for: g.assignee,
      title: `${g.name} not bought yet`,
      detail: `Needed ${relativeDay(g.neededBy, on)} (${weekday(g.neededBy)}) for ${g.forMeals.join(', ')}`,
      inDays: n,
    });
  }
  for (const b of s.bills) {
    const n = diffDays(on, b.dueDate);
    if (b.status === 'paid' || n > 3) continue;
    out.push({
      id: `b-${b.id}`,
      kind: 'bill',
      title: `${b.name} bill ${n < 0 ? 'overdue' : 'due'}`,
      detail: `${formatInr(b.amount)} due ${relativeDay(b.dueDate, on)}`,
      inDays: n,
    });
  }
  for (const t of s.tasks) {
    const n = diffDays(on, t.due);
    if (t.status === 'done' || n > 1) continue;
    out.push({
      id: `t-${t.id}`,
      kind: 'task',
      for: t.assignee,
      title: t.title,
      detail: `Due ${relativeDay(t.due, on)}`,
      inDays: n,
    });
  }
  return out.sort((a, b) => a.inDays - b.inDays);
}

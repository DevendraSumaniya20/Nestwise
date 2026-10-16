import { netBalances, settleUp } from '../balances';
import { addDays, overlapDays } from '../../utils/dates';
import { addMealsToGroceries } from '../groceries';
import type { Bill, Expense, FlatState, Member } from '../../types';
import { formatInr, parseRupees, splitByOccupancy, splitEqual } from '../../utils/money';
import { reminders } from '../reminders';
import {
  billExpense,
  moveOutSettlement,
  outstandingAfterMoveOut,
  settlementExpense,
} from '../settlement';

const members: Member[] = ['rahul', 'amit', 'jay', 'karan'].map(id => ({
  id,
  name: id,
  moveIn: '2026-01-01',
}));
const ids = members.map(m => m.id);

const expense = (paidBy: string, amount: number): Expense => ({
  id: `${paidBy}-${amount}`,
  title: 'x',
  category: 'Groceries',
  amount,
  date: '2026-10-01',
  paid: { [paidBy]: amount },
  owed: splitEqual(amount, ids),
});

const electricity: Bill = {
  id: 'elec',
  name: 'Electricity',
  category: 'Electricity',
  amount: 310000, // ₹3,100 estimate for 31 days
  dueDate: '2026-11-05',
  periodStart: '2026-10-01',
  periodEnd: '2026-10-31',
  status: 'pending',
};

test('money parsing, formatting and exact splits', () => {
  expect(parseRupees('1,250.5')).toBe(125050);
  expect(parseRupees('0')).toBeNull();
  expect(parseRupees('abc')).toBeNull();
  expect(formatInr(125050)).toBe('₹1,250.50');
  expect(formatInr(-82000)).toBe('−₹820');
  const parts = splitEqual(100, ['a', 'b', 'c']);
  expect(Object.values(parts).reduce((s, x) => s + x, 0)).toBe(100);
});

test('dates', () => {
  expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
  expect(overlapDays('2026-10-01', '2026-10-20', '2026-10-01', '2026-10-31')).toBe(20);
  expect(overlapDays('2026-11-01', '2026-11-20', '2026-10-01', '2026-10-31')).toBe(0);
});

test('balances and settle-up zero everyone out', () => {
  const net = netBalances([expense('rahul', 240000), expense('amit', 40000)], ids);
  expect(net).toEqual({ rahul: 170000, amit: -30000, jay: -70000, karan: -70000 });
  const transfers = settleUp(net);
  const after = { ...net };
  for (const t of transfers) {
    after[t.from] += t.amount;
    after[t.to] -= t.amount;
  }
  expect(Object.values(after).every(v => v === 0)).toBe(true);
});

test('occupancy split charges a leaver only for their days', () => {
  const ms = members.map(m => (m.id === 'rahul' ? { ...m, moveOut: '2026-10-20' } : m));
  const split = splitByOccupancy(310000, ms, '2026-10-01', '2026-10-31');
  // rahul 20 of 20 + 31*3 = 113 day-weights
  expect(Math.abs(split.rahul - (310000 * 20) / 113)).toBeLessThan(1);
  expect(Object.values(split).reduce((s, x) => s + x, 0)).toBe(310000);
});

test('move-out settlement, payout, then reconciliation when the real bill arrives', () => {
  const expenses = [expense('rahul', 240000)]; // rahul +180000
  const s = moveOutSettlement('rahul', '2026-10-20', members, expenses, [electricity]);
  const left = members.map(m => (m.id === 'rahul' ? { ...m, moveOut: '2026-10-20' } : m));
  const est = splitByOccupancy(310000, left, '2026-10-01', '2026-10-31').rahul;
  expect(s.balance).toBe(180000);
  expect(s.estimates[0].share).toBe(est);
  expect(s.final).toBe(180000 - est);

  // Book payout and the move-out date.
  const payout = settlementExpense(s, ['amit', 'jay', 'karan'], 'settle')!;
  const ms = left;
  const booked = [...expenses, payout];
  expect(netBalances(booked, ids).rahul).toBe(est);
  expect(outstandingAfterMoveOut('rahul', ms, booked, [electricity])).toBe(0);

  // Real bill is ₹3,390 (higher than the ₹3,100 estimate) and Amit pays it.
  const actual = { ...electricity, amount: 339000, status: 'paid' as const };
  const paid = [...booked, billExpense(actual, 'amit', ms, 'e2', '2026-11-03')];
  const actualShare = splitByOccupancy(339000, ms, '2026-10-01', '2026-10-31').rahul;
  expect(outstandingAfterMoveOut('rahul', ms, paid, [actual])).toBe(est - actualShare);
  expect(est - actualShare).toBeLessThan(0); // rahul owes a small top-up
});

test('meals become a merged grocery list with earliest needed-by date', () => {
  let n = 0;
  const meals = [
    { id: 'm1', date: '2026-10-16', name: 'A', listed: false, ingredients: [{ name: 'Tomato', qty: 0.25, unit: 'kg' }] },
    { id: 'm2', date: '2026-10-14', name: 'B', listed: false, ingredients: [{ name: 'tomato', qty: 0.5, unit: 'kg' }, { name: 'Spinach', qty: 0.5, unit: 'kg' }] },
    { id: 'm3', date: '2026-11-30', name: 'C', listed: false, ingredients: [{ name: 'Rice', qty: 1, unit: 'kg' }] },
  ];
  const r = addMealsToGroceries(meals, [], '2026-10-12', '2026-10-18', () => `g${n++}`);
  expect(r.added).toBe(2);
  const tomato = r.groceries.find(g => g.name === 'Tomato')!;
  expect(tomato.qty).toBe(0.75);
  expect(tomato.neededBy).toBe('2026-10-14');
  expect(r.meals.map(m => m.listed)).toEqual([true, true, false]);
  // Running again does not duplicate.
  expect(addMealsToGroceries(r.meals, r.groceries, '2026-10-12', '2026-10-18', () => 'x').added).toBe(0);
});

test('reminders: Friday spinach still unbought on Thursday', () => {
  const state: FlatState = {
    version: 1,
    flatName: 'x',
    currentUserId: 'rahul',
    members,
    expenses: [],
    bills: [{ ...electricity, dueDate: '2026-10-17' }],
    meals: [],
    groceries: [
      { id: 's', name: 'Spinach', qty: 0.5, unit: 'kg', neededBy: '2026-10-16', forMeals: ['Palak Paneer'], assignee: 'rahul', bought: false },
      { id: 'r', name: 'Rice', qty: 1, unit: 'kg', neededBy: '2026-10-25', forMeals: ['Pulao'], bought: false },
    ],
    tasks: [],
  };
  const r = reminders(state, '2026-10-15'); // Thursday
  expect(r.map(x => x.id)).toEqual(['g-s', 'b-elec']);
  expect(r[0].for).toBe('rahul');
  expect(r[0].detail).toContain('tomorrow (Fri)');
});

test('myShare and myDebts describe money from one person’s view', () => {
  const { myShare, myDebts } = require('../balances') as typeof import('../balances');
  const e = expense('rahul', 240000);
  expect(myShare(e, 'rahul')).toEqual({ kind: 'lent', amount: 180000 });
  expect(myShare(e, 'amit')).toEqual({ kind: 'borrowed', amount: 60000 });
  expect(myShare({ ...e, owed: { amit: 240000 } }, 'jay')).toEqual({ kind: 'none', amount: 0 });
  expect(myDebts([{ from: 'amit', to: 'rahul', amount: 5 }, { from: 'rahul', to: 'jay', amount: 3 }], 'rahul')).toEqual([
    { other: 'amit', amount: 5, owesMe: true },
    { other: 'jay', amount: 3, owesMe: false },
  ]);
});

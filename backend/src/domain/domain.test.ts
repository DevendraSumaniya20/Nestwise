import assert from 'node:assert/strict';
import { test } from 'node:test';
import { netBalances, settleUp } from './balances.ts';
import { addDays, overlapDays } from './dates.ts';
import { addMealsToGroceries } from './groceries.ts';
import type { Bill, Expense, FlatState, Member } from './model.ts';
import { formatInr, parseRupees, splitByOccupancy, splitByWeights, splitEqual } from './money.ts';
import { addMonths, nextAssignee, nextPeriod } from './recurring.ts';
import { spending } from './spending.ts';
import { lowStock } from './pantry.ts';
import { reminders } from './reminders.ts';
import { billExpense, moveOutSettlement, outstandingAfterMoveOut, settlementExpense } from './settlement.ts';

const members: Member[] = ['rahul', 'amit', 'jay', 'karan'].map(id => ({ id, name: id, moveIn: '2026-01-01' }));
const ids = members.map(m => m.id);
const left = members.map(m => (m.id === 'rahul' ? { ...m, moveOut: '2026-10-20' } : m));
const expense = (paidBy: string, amount: number): Expense => ({
  id: `${paidBy}-${amount}`, title: 'x', category: 'Groceries', amount, date: '2026-10-01',
  paid: { [paidBy]: amount }, owed: splitEqual(amount, ids),
});
const electricity: Bill = {
  id: 'elec', name: 'Electricity', category: 'Electricity', amount: 310000, dueDate: '2026-11-05',
  periodStart: '2026-10-01', periodEnd: '2026-10-31', status: 'pending',
};
const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

test('money parsing, formatting and exact splits', () => {
  assert.equal(parseRupees('1,250.5'), 125050);
  assert.equal(parseRupees('0'), null);
  assert.equal(parseRupees('1.234'), null);
  assert.equal(formatInr(125050), '₹1,250.50');
  assert.equal(sum(splitEqual(100, ['a', 'b', 'c'])), 100);
});

test('dates', () => {
  assert.equal(addDays('2026-10-31', 1), '2026-11-01');
  assert.equal(overlapDays('2026-10-01', '2026-10-20', '2026-10-01', '2026-10-31'), 20);
  assert.equal(overlapDays('2026-11-01', '2026-11-20', '2026-10-01', '2026-10-31'), 0);
});

test('settle-up zeroes every balance', () => {
  const net = netBalances([expense('rahul', 240000), expense('amit', 40000)], ids);
  assert.deepEqual(net, { rahul: 170000, amit: -30000, jay: -70000, karan: -70000 });
  const after: Record<string, number> = { ...net };
  for (const t of settleUp(net)) {
    after[t.from]! += t.amount;
    after[t.to]! -= t.amount;
  }
  assert.ok(Object.values(after).every(v => v === 0));
});

test('occupancy split charges a leaver only for their days, to the paisa', () => {
  const split = splitByOccupancy(310000, left, '2026-10-01', '2026-10-31');
  assert.ok(Math.abs(split.rahul! - (310000 * 20) / 113) < 1);
  assert.equal(sum(split), 310000);
});

test('move-out settlement then reconciliation when the real bill arrives', () => {
  const expenses = [expense('rahul', 240000)];
  const s = moveOutSettlement('rahul', '2026-10-20', members, expenses, [electricity]);
  const est = splitByOccupancy(310000, left, '2026-10-01', '2026-10-31').rahul!;
  assert.equal(s.final, 180000 - est);
  const booked = [...expenses, settlementExpense(s, ['amit', 'jay', 'karan'], 'settle')!];
  assert.equal(outstandingAfterMoveOut('rahul', left, booked, [electricity]), 0);
  const actual = { ...electricity, amount: 339000, status: 'paid' as const };
  const paid = [...booked, billExpense(actual, 'amit', left, 'e2', '2026-11-03')];
  const actualShare = splitByOccupancy(339000, left, '2026-10-01', '2026-10-31').rahul!;
  assert.equal(outstandingAfterMoveOut('rahul', left, paid, [actual]), est - actualShare);
});

test('meals merge into groceries with the earliest needed-by date, idempotently', () => {
  let n = 0;
  const meals = [
    { id: 'm1', date: '2026-10-16', name: 'A', listed: false, ingredients: [{ name: 'Tomato', qty: 0.25, unit: 'kg' }] },
    { id: 'm2', date: '2026-10-14', name: 'B', listed: false, ingredients: [{ name: 'tomato', qty: 0.5, unit: 'kg' }] },
  ];
  const r = addMealsToGroceries(meals, [], '2026-10-12', '2026-10-18', () => `g${n++}`);
  assert.equal(r.groceries.length, 1);
  assert.equal(r.groceries[0]!.qty, 0.75);
  assert.equal(r.groceries[0]!.neededBy, '2026-10-14');
  assert.equal(addMealsToGroceries(r.meals, r.groceries, '2026-10-12', '2026-10-18', () => 'x').added, 0);
});

test('reminders: Friday spinach still unbought on Thursday goes to its buyer', () => {
  const state: FlatState = {
    version: 1, flatName: 'x', currentUserId: 'rahul', members, expenses: [], meals: [], tasks: [], pantry: [], inventory: [],
    bills: [{ ...electricity, dueDate: '2026-10-17' }],
    groceries: [
      { id: 's', name: 'Spinach', qty: 0.5, unit: 'kg', neededBy: '2026-10-16', forMeals: ['Palak Paneer'], assignee: 'rahul', bought: false },
      { id: 'r', name: 'Rice', qty: 1, unit: 'kg', neededBy: '2026-10-25', forMeals: ['Pulao'], bought: false },
    ],
  };
  const r = reminders(state, '2026-10-15');
  assert.deepEqual(r.map(x => x.id), ['g-s', 'b-elec']);
  assert.equal(r[0]!.for, 'rahul');
});

test('recurring: month math and chore rotation', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonths('2026-12-15', 1), '2027-01-15');
  assert.deepEqual(nextPeriod('2026-10-01', '2026-10-31'), { periodStart: '2026-11-01', periodEnd: '2026-11-30' });
  assert.equal(nextAssignee(members, 'amit', '2026-10-01'), 'jay');
  assert.equal(nextAssignee(members, 'karan', '2026-10-01'), 'rahul');
  // Rahul moved out on 20 Oct, so the rota skips him after that.
  assert.equal(nextAssignee(left, 'karan', '2026-10-25'), 'amit');
  assert.equal(nextAssignee(left, 'rahul', '2026-10-25'), 'amit');
  assert.deepEqual(splitByWeights(1000, { a: 2, b: 1, c: 1 }), { a: 500, b: 250, c: 250 });
});

test('spending: one month, by category and person, settlements excluded', () => {
  const rent: Expense = { ...expense('amit', 400), id: 'rent', category: 'Rent' };
  const old: Expense = { ...expense('jay', 1000), id: 'old', date: '2026-09-30' };
  const payBack: Expense = { id: 'pay', title: 'Payment', category: 'Settlement', amount: 100, date: '2026-10-02', paid: { jay: 100 }, owed: { amit: 100 } };
  const s = spending([expense('rahul', 800), rent, old, payBack], '2026-10');
  assert.equal(s.total, 1200);
  assert.deepEqual(s.byCategory, [{ category: 'Groceries', amount: 800 }, { category: 'Rent', amount: 400 }]);
  assert.deepEqual(s.byMember.find(m => m.memberId === 'rahul'), { memberId: 'rahul', paid: 800, share: 300 });
  assert.equal(sum(Object.fromEntries(s.byMember.map(m => [m.memberId, m.share]))), 1200);
});

test('pantry: low items go on the list once; deposit is refunded on move-out', () => {
  const rice = { id: 'r', name: 'Rice', qty: 1, unit: 'kg', lowAt: 2 };
  const oil = { id: 'o', name: 'Oil', qty: 3, unit: 'l', lowAt: 1 };
  assert.deepEqual(lowStock([rice, oil], []), [rice]);
  const listed = { id: 'g', name: 'rice', qty: 2, unit: 'KG', neededBy: '2026-10-01', forMeals: [], bought: false };
  assert.deepEqual(lowStock([rice], [listed]), []);
  assert.deepEqual(lowStock([rice], [{ ...listed, bought: true }]), [rice]);

  const withDeposit = members.map(m => (m.id === 'rahul' ? { ...m, deposit: 500000 } : m));
  const s = moveOutSettlement('rahul', '2026-10-20', withDeposit, [], []);
  assert.equal(s.deposit, 500000);
  assert.equal(s.final, 500000);
});

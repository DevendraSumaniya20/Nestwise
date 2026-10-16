import { netBalances } from '../../services/balances';
import { outstandingAfterMoveOut } from '../../services/settlement';
import { seedFlat } from '../../data/seed';
import { flatReducer } from '../flatReducer';

test('moving out books a settlement that leaves nothing outstanding', () => {
  const s0 = seedFlat('2026-10-16');
  const s1 = flatReducer(s0, { type: 'moveOut', memberId: 'rahul', date: '2026-10-16' });
  expect(s1.members.find(m => m.id === 'rahul')!.moveOut).toBe('2026-10-16');
  expect(s1.currentUserId).not.toBe('rahul');
  expect(outstandingAfterMoveOut('rahul', s1.members, s1.expenses, s1.bills)).toBe(0);
  const net = netBalances(s1.expenses, s1.members.map(m => m.id));
  expect(Object.values(net).reduce((a, b) => a + b, 0)).toBe(0);
});

test('meals -> groceries -> bought', () => {
  const s0 = seedFlat('2026-10-16');
  const s1 = flatReducer(s0, { type: 'generateGroceries', from: '2026-10-16', to: '2026-10-22' });
  expect(s1.groceries.length).toBeGreaterThan(0);
  const first = s1.groceries[0];
  const s2 = flatReducer(s1, { type: 'toggleBought', id: first.id });
  expect(s2.groceries[0].bought).toBe(true);
});

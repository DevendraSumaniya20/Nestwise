import { flatApi } from '../../services/api';
import type { FlatState } from '../../types';
import { runAction } from '../actions';

jest.mock('../../services/api', () => ({
  flatApi: new Proxy({}, { get: (target: Record<string, jest.Mock>, k: string) => (target[k] ??= jest.fn(async () => ({}))) }),
}));

const s = {
  groceries: [{ id: 'g1', bought: false }],
  tasks: [{ id: 't1', status: 'in_progress' }],
} as unknown as FlatState;

test('toggleBought sends the opposite of the current value', async () => {
  await runAction('f', s, { type: 'toggleBought', id: 'g1' });
  expect(flatApi.updateGrocery).toHaveBeenCalledWith('f', 'g1', { bought: true });
});

test('cycleTask moves to the next status', async () => {
  await runAction('f', s, { type: 'cycleTask', id: 't1' });
  expect(flatApi.setTaskStatus).toHaveBeenCalledWith('f', 't1', 'done');
});

test('unassigning a grocery sends null', async () => {
  await runAction('f', s, { type: 'assignGrocery', id: 'g1', assignee: undefined });
  expect(flatApi.updateGrocery).toHaveBeenCalledWith('f', 'g1', { assigneeId: null });
});

test('setMeal sends the recipe name, or null to clear', async () => {
  await runAction('f', s, { type: 'setMeal', date: '2026-10-16', recipe: { name: 'Veg Pasta', ingredients: [] } });
  expect(flatApi.setMeal).toHaveBeenCalledWith('f', '2026-10-16', 'Veg Pasta');
  await runAction('f', s, { type: 'setMeal', date: '2026-10-16', recipe: null });
  expect(flatApi.setMeal).toHaveBeenLastCalledWith('f', '2026-10-16', null);
});

import { addDays } from '../domain/dates';
import type { FlatState, Member } from '../domain/model';
import { splitEqual } from '../domain/money';
import { RECIPES } from '../domain/recipes';

/** Demo flat from the original idea, dated around `on` so reminders show up. */
export function seedFlat(on: string): FlatState {
  const moveIn = addDays(on, -120);
  const members: Member[] = [
    { id: 'rahul', name: 'Rahul', moveIn },
    { id: 'amit', name: 'Amit', moveIn },
    { id: 'jay', name: 'Jay', moveIn },
    { id: 'karan', name: 'Karan', moveIn },
  ];
  const all = members.map(m => m.id);
  const exp = (
    id: string,
    title: string,
    category: FlatState['expenses'][number]['category'],
    rupees: number,
    paidBy: string,
    daysAgo: number,
  ) => ({
    id,
    title,
    category,
    amount: rupees * 100,
    date: addDays(on, -daysAgo),
    paid: { [paidBy]: rupees * 100 },
    owed: splitEqual(rupees * 100, all),
  });
  return {
    version: 1,
    flatName: 'Sunrise Apartment',
    currentUserId: 'rahul',
    members,
    expenses: [
      exp('e1', 'Rent', 'Rent', 24000, 'amit', 12),
      exp('e2', 'Weekly groceries', 'Groceries', 2400, 'rahul', 6),
      exp('e3', 'Cleaning lady', 'Cleaning', 800, 'jay', 4),
      exp('e4', 'Gas cylinder', 'Gas', 900, 'karan', 2),
    ],
    bills: [
      {
        id: 'b1',
        name: 'Electricity',
        category: 'Electricity',
        amount: 342000,
        dueDate: addDays(on, 2),
        periodStart: addDays(on, -30),
        periodEnd: addDays(on, -1),
        status: 'pending',
      },
      {
        id: 'b2',
        name: 'Wi-Fi',
        category: 'Wi-Fi',
        amount: 79900,
        dueDate: addDays(on, 3),
        periodStart: addDays(on, -30),
        periodEnd: addDays(on, -1),
        status: 'pending',
      },
    ],
    meals: RECIPES.slice(0, 7).map((r, i) => ({
      id: `m${i}`,
      date: addDays(on, i),
      name: r.name,
      ingredients: r.ingredients,
      listed: false,
    })),
    groceries: [],
    tasks: [
      { id: 't1', title: 'Clean kitchen', assignee: 'jay', due: addDays(on, 1), status: 'pending' },
      { id: 't2', title: 'Pay electricity bill', assignee: 'amit', due: addDays(on, 2), status: 'pending' },
      { id: 't3', title: 'Take out recycling', assignee: 'rahul', due: on, status: 'in_progress' },
    ],
  };
}

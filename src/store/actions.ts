import type { Recipe } from '../data/recipes';
import { flatApi } from '../services/api';
import type { Bill, ExpenseCategory, FlatState, Id, IsoDate, Paise, Task } from '../types';

const NEXT: Record<Task['status'], Task['status']> = {
  pending: 'in_progress',
  in_progress: 'done',
  done: 'pending',
};

export type Action =
  | {
      type: 'addExpense';
      title: string;
      category: ExpenseCategory;
      amount: Paise;
      paidBy: Id;
      splitAmong: Id[];
      date: IsoDate;
      /** Shares per person for an unequal split; omitted = equal. */
      weights?: Record<Id, number>;
      /** Several payers (paise each, summing to amount); omitted = `paidBy` paid it all. */
      payers?: Record<Id, Paise>;
    }
  | { type: 'deleteExpense'; id: Id }
  | { type: 'addBill'; bill: Omit<Bill, 'id' | 'status'> }
  | { type: 'payBill'; billId: Id; payerId: Id; amount: Paise; date: IsoDate }
  | { type: 'setMeal'; date: IsoDate; recipe: Recipe | null }
  | { type: 'generateGroceries'; from: IsoDate; to: IsoDate }
  | { type: 'addGrocery'; name: string; qty: number; unit: string; neededBy: IsoDate }
  | { type: 'toggleBought'; id: Id }
  | { type: 'assignGrocery'; id: Id; assignee: Id | undefined }
  | { type: 'assignAllOpen'; assignee: Id }
  | { type: 'addTask'; title: string; assignee: Id; due: IsoDate; repeatDays?: number }
  | { type: 'deleteTask'; id: Id }
  | { type: 'cycleTask'; id: Id }
  | { type: 'addMember'; name: string; moveIn: IsoDate }
  | { type: 'moveOut'; memberId: Id; date: IsoDate };

/** Each action is one API call; the server answers with the fresh flat state. */
export function runAction(flatId: Id, s: FlatState, a: Action): Promise<FlatState> {
  switch (a.type) {
    case 'addExpense':
      return flatApi.addExpense(flatId, {
        title: a.title,
        category: a.category,
        amount: a.amount,
        paidBy: a.paidBy,
        splitAmong: a.splitAmong,
        date: a.date,
        ...(a.weights && { weights: a.weights }),
        ...(a.payers && { payers: a.payers }),
      });
    case 'deleteExpense':
      return flatApi.deleteExpense(flatId, a.id);
    case 'addBill':
      return flatApi.addBill(flatId, a.bill);
    case 'payBill':
      return flatApi.payBill(flatId, a.billId, { payerId: a.payerId, amount: a.amount, date: a.date });
    case 'setMeal':
      return flatApi.setMeal(flatId, a.date, a.recipe?.name ?? null);
    case 'generateGroceries':
      return flatApi.generateGroceries(flatId, a.from, a.to);
    case 'addGrocery':
      return flatApi.addGrocery(flatId, { name: a.name, qty: a.qty, unit: a.unit, neededBy: a.neededBy });
    case 'toggleBought': {
      const item = s.groceries.find(g => g.id === a.id);
      return flatApi.updateGrocery(flatId, a.id, { bought: !item?.bought });
    }
    case 'assignGrocery':
      return flatApi.updateGrocery(flatId, a.id, { assigneeId: a.assignee ?? null });
    case 'assignAllOpen':
      return flatApi.assignOpen(flatId, a.assignee);
    case 'addTask':
      return flatApi.addTask(flatId, {
        title: a.title,
        assignee: a.assignee,
        due: a.due,
        ...(a.repeatDays && { repeatDays: a.repeatDays }),
      });
    case 'deleteTask':
      return flatApi.deleteTask(flatId, a.id);
    case 'cycleTask': {
      const task = s.tasks.find(t => t.id === a.id);
      return flatApi.setTaskStatus(flatId, a.id, NEXT[task?.status ?? 'done']);
    }
    case 'addMember':
      return flatApi.addMember(flatId, { name: a.name, moveIn: a.moveIn });
    case 'moveOut':
      return flatApi.moveOut(flatId, a.memberId, a.date);
  }
}

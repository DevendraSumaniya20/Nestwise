import { addMealsToGroceries } from '../services/groceries';
import type {
  Bill,
  ExpenseCategory,
  FlatState,
  Id,
  IsoDate,
  Paise,
  Task,
} from '../types';
import { splitEqual } from '../utils/money';
import type { Recipe } from '../data/recipes';
import {
  billExpense,
  isActiveOn,
  moveOutSettlement,
  settlementExpense,
} from '../services/settlement';

export const newId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const NEXT: Record<Task['status'], Task['status']> = {
  pending: 'in_progress',
  in_progress: 'done',
  done: 'pending',
};

export type Action =
  | { type: 'hydrate'; state: FlatState }
  | { type: 'setCurrentUser'; id: Id }
  | {
      type: 'addExpense';
      title: string;
      category: ExpenseCategory;
      amount: Paise;
      paidBy: Id;
      splitAmong: Id[];
      date: IsoDate;
    }
  | { type: 'addBill'; bill: Omit<Bill, 'id' | 'status'> }
  | { type: 'payBill'; billId: Id; payerId: Id; amount: Paise; date: IsoDate }
  | { type: 'setMeal'; date: IsoDate; recipe: Recipe | null }
  | { type: 'generateGroceries'; from: IsoDate; to: IsoDate }
  | { type: 'addGrocery'; name: string; qty: number; unit: string; neededBy: IsoDate }
  | { type: 'toggleBought'; id: Id }
  | { type: 'assignGrocery'; id: Id; assignee: Id | undefined }
  | { type: 'assignAllOpen'; assignee: Id }
  | { type: 'addTask'; title: string; assignee: Id; due: IsoDate }
  | { type: 'cycleTask'; id: Id }
  | { type: 'addMember'; name: string; moveIn: IsoDate }
  | { type: 'moveOut'; memberId: Id; date: IsoDate };

export function flatReducer(s: FlatState, a: Action): FlatState {
  switch (a.type) {
    case 'hydrate':
      return a.state;
    case 'setCurrentUser':
      return { ...s, currentUserId: a.id };
    case 'addExpense':
      return {
        ...s,
        expenses: [
          {
            id: newId(),
            title: a.title,
            category: a.category,
            amount: a.amount,
            date: a.date,
            paid: { [a.paidBy]: a.amount },
            owed: splitEqual(a.amount, a.splitAmong),
          },
          ...s.expenses,
        ],
      };
    case 'addBill':
      return {
        ...s,
        bills: [...s.bills, { ...a.bill, id: newId(), status: 'pending' }],
      };
    case 'payBill': {
      const bill = s.bills.find(b => b.id === a.billId);
      if (!bill || bill.status === 'paid') return s;
      const paid: Bill = { ...bill, amount: a.amount, status: 'paid' };
      return {
        ...s,
        bills: s.bills.map(b => (b.id === a.billId ? paid : b)),
        expenses: [
          billExpense(paid, a.payerId, s.members, newId(), a.date),
          ...s.expenses,
        ],
      };
    }
    case 'setMeal': {
      const others = s.meals.filter(m => m.date !== a.date);
      if (!a.recipe) return { ...s, meals: others };
      return {
        ...s,
        meals: [
          ...others,
          {
            id: newId(),
            date: a.date,
            name: a.recipe.name,
            ingredients: a.recipe.ingredients,
            listed: false,
          },
        ].sort((x, y) => x.date.localeCompare(y.date)),
      };
    }
    case 'generateGroceries': {
      const r = addMealsToGroceries(s.meals, s.groceries, a.from, a.to, newId);
      return { ...s, meals: r.meals, groceries: r.groceries };
    }
    case 'addGrocery':
      return {
        ...s,
        groceries: [
          ...s.groceries,
          {
            id: newId(),
            name: a.name,
            qty: a.qty,
            unit: a.unit,
            neededBy: a.neededBy,
            forMeals: [],
            bought: false,
          },
        ],
      };
    case 'toggleBought':
      return {
        ...s,
        groceries: s.groceries.map(g =>
          g.id === a.id ? { ...g, bought: !g.bought } : g,
        ),
      };
    case 'assignGrocery':
      return {
        ...s,
        groceries: s.groceries.map(g =>
          g.id === a.id ? { ...g, assignee: a.assignee } : g,
        ),
      };
    case 'assignAllOpen':
      return {
        ...s,
        groceries: s.groceries.map(g =>
          g.bought || g.assignee ? g : { ...g, assignee: a.assignee },
        ),
      };
    case 'addTask':
      return {
        ...s,
        tasks: [
          ...s.tasks,
          { id: newId(), title: a.title, assignee: a.assignee, due: a.due, status: 'pending' },
        ],
      };
    case 'cycleTask':
      return {
        ...s,
        tasks: s.tasks.map(t =>
          t.id === a.id ? { ...t, status: NEXT[t.status] } : t,
        ),
      };
    case 'addMember':
      return {
        ...s,
        members: [...s.members, { id: newId(), name: a.name, moveIn: a.moveIn }],
      };
    case 'moveOut': {
      const settlement = moveOutSettlement(
        a.memberId,
        a.date,
        s.members,
        s.expenses,
        s.bills,
      );
      const staying = s.members
        .filter(m => m.id !== a.memberId && isActiveOn(m, a.date))
        .map(m => m.id);
      const payout = settlementExpense(settlement, staying, newId());
      return {
        ...s,
        currentUserId:
          s.currentUserId === a.memberId ? staying[0] ?? s.currentUserId : s.currentUserId,
        members: s.members.map(m =>
          m.id === a.memberId ? { ...m, moveOut: a.date } : m,
        ),
        expenses: payout ? [payout, ...s.expenses] : s.expenses,
      };
    }
  }
}

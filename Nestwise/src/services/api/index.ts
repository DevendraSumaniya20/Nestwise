import type { Bill, ExpenseCategory, ExpenseComment, FlatState, Id, IsoDate, Paise, Spending, Task } from '../../types';
import { api, publicApi } from './client';

export * from './client';
export type { Tokens } from './tokenStore';

export type User = { id: string; email: string; name: string };
export type AuthResult = { accessToken: string; refreshToken: string; accessExpiresAt: string; user: User };
export type FlatSummary = { id: string; name: string; joinCode: string; memberCount: number };

export const authApi = {
  register: (b: { email: string; name: string; password: string }) => publicApi<AuthResult>('POST', '/auth/register', b),
  login: (b: { email: string; password: string }) => publicApi<AuthResult>('POST', '/auth/login', b),
  forgotPassword: (email: string) => publicApi<{ message: string }>('POST', '/auth/forgot-password', { email }),
  resetPassword: (b: { email: string; code: string; password: string }) =>
    publicApi<AuthResult>('POST', '/auth/reset-password', b),
  logout: () => api<void>('POST', '/auth/logout'),
  me: () => api<{ user: User }>('GET', '/me'),
};

const f = (flatId: Id) => `/flats/${flatId}`;

export const flatApi = {
  list: () => api<{ flats: FlatSummary[] }>('GET', '/flats'),
  create: (name: string) => api<FlatState>('POST', '/flats', { name }),
  join: (code: string) => api<FlatState>('POST', '/flats/join', { code }),
  state: (flatId: Id) => api<FlatState>('GET', f(flatId)),
  joinCode: (flatId: Id) => api<{ code: string }>('GET', `${f(flatId)}/join-code`),
  addMember: (flatId: Id, b: { name: string; moveIn: IsoDate }) => api<FlatState>('POST', `${f(flatId)}/members`, b),
  moveOut: (flatId: Id, memberId: Id, date: IsoDate) =>
    api<FlatState>('POST', `${f(flatId)}/members/${memberId}/move-out`, { date }),
  setDeposit: (flatId: Id, memberId: Id, amount: Paise) =>
    api<FlatState>('PUT', `${f(flatId)}/members/${memberId}/deposit`, { amount }),
  addPantry: (flatId: Id, b: { name: string; qty: number; unit: string; lowAt: number }) =>
    api<FlatState>('POST', `${f(flatId)}/pantry`, b),
  updatePantry: (flatId: Id, itemId: Id, b: { qty?: number; lowAt?: number }) =>
    api<FlatState>('PATCH', `${f(flatId)}/pantry/${itemId}`, b),
  deletePantry: (flatId: Id, itemId: Id) => api<FlatState>('DELETE', `${f(flatId)}/pantry/${itemId}`),
  addInventory: (flatId: Id, b: { name: string; ownerId: Id | null; value: Paise }) =>
    api<FlatState>('POST', `${f(flatId)}/inventory`, b),
  deleteInventory: (flatId: Id, itemId: Id) => api<FlatState>('DELETE', `${f(flatId)}/inventory/${itemId}`),
  addExpense: (
    flatId: Id,
    b: {
      title: string;
      category: ExpenseCategory;
      amount: Paise;
      paidBy: Id;
      splitAmong: Id[];
      date: IsoDate;
      weights?: Record<Id, number>;
      payers?: Record<Id, Paise>;
    },
  ) => api<FlatState>('POST', `${f(flatId)}/expenses`, b),
  spending: (flatId: Id, month: string) => api<Spending>('GET', `${f(flatId)}/spending?month=${month}`),
  comments: (flatId: Id, expenseId: Id) =>
    api<{ comments: ExpenseComment[] }>('GET', `${f(flatId)}/expenses/${expenseId}/comments`),
  addComment: (flatId: Id, expenseId: Id, body: string) =>
    api<{ comments: ExpenseComment[] }>('POST', `${f(flatId)}/expenses/${expenseId}/comments`, { body }),
  deleteExpense: (flatId: Id, expenseId: Id) => api<FlatState>('DELETE', `${f(flatId)}/expenses/${expenseId}`),
  addBill: (flatId: Id, b: Omit<Bill, 'id' | 'status'>) => api<FlatState>('POST', `${f(flatId)}/bills`, b),
  payBill: (flatId: Id, billId: Id, b: { payerId: Id; amount: Paise; date: IsoDate }) =>
    api<FlatState>('POST', `${f(flatId)}/bills/${billId}/pay`, b),
  setMeal: (flatId: Id, date: IsoDate, recipe: string | null) =>
    api<FlatState>('PUT', `${f(flatId)}/meals/${date}`, { recipe }),
  generateGroceries: (flatId: Id, from: IsoDate, to: IsoDate) =>
    api<FlatState>('POST', `${f(flatId)}/groceries/generate`, { from, to }),
  addGrocery: (flatId: Id, b: { name: string; qty: number; unit: string; neededBy: IsoDate }) =>
    api<FlatState>('POST', `${f(flatId)}/groceries`, b),
  updateGrocery: (flatId: Id, itemId: Id, b: { bought?: boolean; assigneeId?: Id | null }) =>
    api<FlatState>('PATCH', `${f(flatId)}/groceries/${itemId}`, b),
  assignOpen: (flatId: Id, assigneeId: Id) => api<FlatState>('POST', `${f(flatId)}/groceries/assign-open`, { assigneeId }),
  addTask: (flatId: Id, b: { title: string; assignee: Id; due: IsoDate; repeatDays?: number }) =>
    api<FlatState>('POST', `${f(flatId)}/tasks`, b),
  deleteTask: (flatId: Id, taskId: Id) => api<FlatState>('DELETE', `${f(flatId)}/tasks/${taskId}`),
  setTaskStatus: (flatId: Id, taskId: Id, status: Task['status']) =>
    api<FlatState>('PATCH', `${f(flatId)}/tasks/${taskId}`, { status }),
};

import { z } from 'zod';
import { EXPENSE_CATEGORIES } from '../../../domain/model.ts';
import { isIsoDate } from '../../../domain/dates.ts';

const isoDate = z.string().refine(isIsoDate, 'must be a date YYYY-MM-DD');
const id = z.string().regex(/^[a-f0-9]{32}$/, 'invalid id');
const paise = z.number().int().positive().max(1_000_000_000);
const email = z.email().max(254);
const password = z.string().min(8, 'must be at least 8 characters').max(128);
const name = z.string().trim().min(1).max(80);

export const registerBody = z.object({ email, name, password });
export const loginBody = z.object({ email, password: z.string().min(1).max(128) });
export const refreshBody = z.object({ refreshToken: z.string().min(20).max(200) });
export const forgotBody = z.object({ email });
export const resetBody = z.object({ email, code: z.string().regex(/^\d{6}$/, 'must be 6 digits'), password });

export const flatParams = z.object({ flatId: id });
export const memberParams = flatParams.extend({ memberId: id });
export const billParams = flatParams.extend({ billId: id });
export const groceryParams = flatParams.extend({ itemId: id });
export const taskParams = flatParams.extend({ taskId: id });
export const mealParams = flatParams.extend({ date: isoDate });

export const createFlatBody = z.object({ name });
export const joinFlatBody = z.object({ code: z.string().trim().length(8) });
export const addMemberBody = z.object({ name, moveIn: isoDate });
export const moveOutBody = z.object({ date: isoDate });
export const settlementQuery = z.object({ date: isoDate });
export const remindersQuery = z.object({ on: isoDate.optional() });

export const addExpenseBody = z.object({
  title: z.string().trim().min(1).max(120),
  category: z.enum(EXPENSE_CATEGORIES).exclude(['Settlement']),
  amount: paise,
  paidBy: id,
  splitAmong: z.array(id).min(1).max(50),
  date: isoDate,
});

export const addBillBody = z
  .object({
    name,
    category: z.enum(EXPENSE_CATEGORIES).exclude(['Settlement']),
    amount: paise,
    dueDate: isoDate,
    periodStart: isoDate,
    periodEnd: isoDate,
  })
  .refine(b => b.periodStart <= b.periodEnd, { path: ['periodEnd'], message: 'must be on or after periodStart' });

export const payBillBody = z.object({ payerId: id, amount: paise, date: isoDate });
export const setMealBody = z.object({ recipe: z.string().min(1).max(80).nullable() });
export const generateGroceriesBody = z.object({ from: isoDate, to: isoDate });
export const addGroceryBody = z.object({
  name,
  qty: z.number().positive().max(10_000),
  unit: z.string().trim().min(1).max(16),
  neededBy: isoDate,
});
export const updateGroceryBody = z
  .object({ bought: z.boolean().optional(), assigneeId: id.nullable().optional() })
  .refine(p => p.bought !== undefined || p.assigneeId !== undefined, 'nothing to update');
export const assignOpenBody = z.object({ assigneeId: id });
export const addTaskBody = z.object({ title: z.string().trim().min(1).max(120), assignee: id, due: isoDate });
export const taskStatusBody = z.object({ status: z.enum(['pending', 'in_progress', 'done']) });

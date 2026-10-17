import type { PublicUser } from './auth-service.ts';
import { AppError } from './errors.ts';
import { netBalances, settleUp } from '../domain/balances.ts';
import { addDays, today as todayIso } from '../domain/dates.ts';
import { addMealsToGroceries } from '../domain/groceries.ts';
import type { Bill, Expense, ExpenseCategory, FlatState, GroceryItem, Ingredient, IsoDate, Meal, Member, Task } from '../domain/model.ts';
import { splitByWeights, splitEqual } from '../domain/money.ts';
import { RECIPES } from '../domain/recipes.ts';
import { addMonths, nextAssignee, nextPeriod } from '../domain/recurring.ts';
import { reminders } from '../domain/reminders.ts';
import { spending } from '../domain/spending.ts';
import { billExpense, isActiveOn, moveOutSettlement, settlementExpense } from '../domain/settlement.ts';
import { newId, newJoinCode } from '../infrastructure/crypto.ts';
import type { PrismaClient } from '../infrastructure/prisma.ts';

const toDb = (d: IsoDate) => new Date(`${d}T00:00:00Z`);
const fromDb = (d: Date): IsoDate => d.toISOString().slice(0, 10);


type Tx = Parameters<Parameters<PrismaClient['$transaction']>[0]>[0];

export type FlatSummary = { id: string; name: string; joinCode: string; memberCount: number };

export class FlatService {
  constructor(private readonly db: PrismaClient) {}

  // ── Workspace ──────────────────────────────────────────

  async listMine(user: PublicUser): Promise<FlatSummary[]> {
    const flats = await this.db.flat.findMany({
      where: { members: { some: { userId: user.id } } },
      include: { _count: { select: { members: true } } },
      orderBy: { createdAt: 'asc' },
    });
    return flats.map(f => ({ id: f.id, name: f.name, joinCode: f.joinCode, memberCount: f._count.members }));
  }

  async create(user: PublicUser, name: string): Promise<FlatState> {
    const flatId = newId();
    // Join codes are random; on the (very rare) unique clash, draw another.
    for (let attempt = 0; ; attempt++) {
      try {
        await this.db.flat.create({
          data: {
            id: flatId,
            name: name.trim(),
            joinCode: newJoinCode(),
            members: { create: { id: newId(), userId: user.id, name: user.name, role: 'admin', moveIn: toDb(todayIso()) } },
          },
        });
        break;
      } catch (e) {
        if (attempt >= 3 || !isUniqueViolation(e)) throw e;
      }
    }
    return this.state(user, flatId);
  }

  async join(user: PublicUser, code: string): Promise<FlatState> {
    const flat = await this.db.flat.findUnique({ where: { joinCode: code.trim().toUpperCase() } });
    if (!flat) throw new AppError('not_found', 'FLAT_NOT_FOUND', 'No flat uses that code. Check it with your flatmate.');
    const existing = await this.db.member.findUnique({ where: { flatId_userId: { flatId: flat.id, userId: user.id } } });
    if (!existing) {
      await this.db.member.create({
        data: { id: newId(), flatId: flat.id, userId: user.id, name: user.name, moveIn: toDb(todayIso()) },
      });
    }
    return this.state(user, flat.id);
  }

  async joinCode(user: PublicUser, flatId: string): Promise<string> {
    await this.me(user, flatId);
    const flat = await this.db.flat.findUniqueOrThrow({ where: { id: flatId } });
    return flat.joinCode;
  }

  // ── Reads ──────────────────────────────────────────────

  /** The whole flat in the same shape the app's domain uses. */
  async state(user: PublicUser, flatId: string): Promise<FlatState> {
    const me = await this.me(user, flatId);
    return this.load(flatId, me.id);
  }

  async balances(user: PublicUser, flatId: string) {
    const s = await this.state(user, flatId);
    const net = netBalances(s.expenses, s.members.map(m => m.id));
    return { balances: net, settleUp: settleUp(net) };
  }

  async reminders(user: PublicUser, flatId: string, on: IsoDate = todayIso()) {
    const s = await this.state(user, flatId);
    return reminders(s, on).filter(r => !r.for || r.for === s.currentUserId);
  }

  async settlementPreview(user: PublicUser, flatId: string, memberId: string, date: IsoDate) {
    const s = await this.state(user, flatId);
    this.assertMembers(s, [memberId]);
    return moveOutSettlement(memberId, date, s.members, s.expenses, s.bills);
  }

  async spending(user: PublicUser, flatId: string, month: string) {
    const s = await this.state(user, flatId);
    return spending(s.expenses, month);
  }

  recipes() {
    return RECIPES;
  }

  // ── Members ────────────────────────────────────────────

  async addMember(user: PublicUser, flatId: string, input: { name: string; moveIn: IsoDate }) {
    await this.me(user, flatId);
    await this.db.member.create({ data: { id: newId(), flatId, name: input.name.trim(), moveIn: toDb(input.moveIn) } });
    return this.state(user, flatId);
  }

  async moveOut(user: PublicUser, flatId: string, memberId: string, date: IsoDate) {
    const s = await this.state(user, flatId);
    const leaver = this.assertMembers(s, [memberId])[0]!;
    if (leaver.moveOut) throw new AppError('conflict', 'ALREADY_MOVED_OUT', `${leaver.name} has already moved out.`);
    if (date < leaver.moveIn) throw new AppError('invalid', 'BEFORE_MOVE_IN', 'Move-out date is before their move-in date.');
    const settlement = moveOutSettlement(memberId, date, s.members, s.expenses, s.bills);
    const staying = s.members.filter(m => m.id !== memberId && isActiveOn(m, date)).map(m => m.id);
    if (staying.length === 0) throw new AppError('invalid', 'LAST_MEMBER', 'Someone has to stay in the flat to settle with.');
    const payout = settlementExpense(settlement, staying, newId());
    await this.db.$transaction(async tx => {
      await tx.member.update({ where: { id: memberId }, data: { moveOut: toDb(date) } });
      if (payout) await this.insertExpense(tx, flatId, payout);
    });
    return this.state(user, flatId);
  }

  // ── Money ──────────────────────────────────────────────

  async addExpense(
    user: PublicUser,
    flatId: string,
    input: {
      title: string;
      category: ExpenseCategory;
      amount: number;
      paidBy: string;
      splitAmong: string[];
      date: IsoDate;
      /** Unequal split: shares per person in `splitAmong` (missing = 1). */
      weights?: Record<string, number> | undefined;
      /** Several people paid: paise per payer, summing to `amount`. Replaces `paidBy`. */
      payers?: Record<string, number> | undefined;
    },
  ) {
    const s = await this.state(user, flatId);
    const payers = input.payers ?? { [input.paidBy]: input.amount };
    this.assertMembers(s, [...Object.keys(payers), ...input.splitAmong]);
    if (Object.values(payers).reduce((a, b) => a + b, 0) !== input.amount) {
      throw new AppError('invalid', 'PAYERS_MISMATCH', 'What each person paid must add up to the total.');
    }
    const among = [...new Set(input.splitAmong)];
    const weights = input.weights;
    await this.insertExpense(this.db, flatId, {
      id: newId(),
      title: input.title.trim(),
      category: input.category,
      amount: input.amount,
      date: input.date,
      paid: payers,
      owed: weights
        ? splitByWeights(input.amount, Object.fromEntries(among.map(id => [id, weights[id] ?? 1])))
        : splitEqual(input.amount, among),
    });
    return this.state(user, flatId);
  }

  async deleteExpense(user: PublicUser, flatId: string, expenseId: string) {
    await this.me(user, flatId);
    const e = await this.db.expense.findFirst({ where: { id: expenseId, flatId } });
    if (!e) throw new AppError('not_found', 'EXPENSE_NOT_FOUND', 'That expense does not exist.');
    // A bill payment's expense is the bill's split; removing it alone would leave the bill "paid" for free.
    if (e.billId) throw new AppError('conflict', 'BILL_EXPENSE', 'This is a bill payment. It cannot be deleted on its own.');
    await this.db.expense.delete({ where: { id: expenseId } });
    return this.state(user, flatId);
  }

  async addBill(user: PublicUser, flatId: string, bill: Omit<Bill, 'id' | 'status' | 'repeatMonthly'> & { repeatMonthly?: boolean | undefined }) {
    await this.me(user, flatId);
    await this.db.bill.create({
      data: {
        id: newId(),
        flatId,
        name: bill.name.trim(),
        category: bill.category,
        amountPaise: bill.amount,
        dueDate: toDb(bill.dueDate),
        periodStart: toDb(bill.periodStart),
        periodEnd: toDb(bill.periodEnd),
        repeatMonthly: bill.repeatMonthly ?? false,
      },
    });
    return this.state(user, flatId);
  }

  async payBill(user: PublicUser, flatId: string, billId: string, input: { payerId: string; amount: number; date: IsoDate }) {
    const s = await this.state(user, flatId);
    this.assertMembers(s, [input.payerId]);
    const bill = s.bills.find(b => b.id === billId);
    if (!bill) throw new AppError('not_found', 'BILL_NOT_FOUND', 'That bill does not exist.');
    if (bill.status === 'paid') throw new AppError('conflict', 'BILL_PAID', 'That bill is already paid.');
    const paid: Bill = { ...bill, amount: input.amount, status: 'paid' };
    await this.db.$transaction(async tx => {
      await tx.bill.update({ where: { id: billId }, data: { amountPaise: input.amount, status: 'paid' } });
      await this.insertExpense(tx, flatId, billExpense(paid, input.payerId, s.members, newId(), input.date));
      if (bill.repeatMonthly) {
        // Next month's bill, estimated at this month's actual amount.
        const next = nextPeriod(bill.periodStart, bill.periodEnd);
        await tx.bill.create({
          data: {
            id: newId(),
            flatId,
            name: bill.name,
            category: bill.category,
            amountPaise: input.amount,
            dueDate: toDb(addMonths(bill.dueDate, 1)),
            periodStart: toDb(next.periodStart),
            periodEnd: toDb(next.periodEnd),
            repeatMonthly: true,
          },
        });
      }
    });
    return this.state(user, flatId);
  }

  async comments(user: PublicUser, flatId: string, expenseId: string) {
    await this.me(user, flatId);
    await this.expenseIn(flatId, expenseId);
    const rows = await this.db.expenseComment.findMany({ where: { expenseId }, orderBy: { createdAt: 'asc' } });
    return rows.map(c => ({ id: c.id, memberId: c.memberId, body: c.body, createdAt: c.createdAt.toISOString() }));
  }

  async addComment(user: PublicUser, flatId: string, expenseId: string, body: string) {
    const me = await this.me(user, flatId);
    await this.expenseIn(flatId, expenseId);
    await this.db.expenseComment.create({ data: { id: newId(), expenseId, memberId: me.id, body: body.trim() } });
    return this.comments(user, flatId, expenseId);
  }

  // ── Meals & groceries ──────────────────────────────────

  async setMeal(user: PublicUser, flatId: string, date: IsoDate, recipeName: string | null) {
    await this.me(user, flatId);
    if (recipeName === null) {
      await this.db.meal.deleteMany({ where: { flatId, date: toDb(date) } });
      return this.state(user, flatId);
    }
    const recipe = RECIPES.find(r => r.name === recipeName);
    if (!recipe) throw new AppError('not_found', 'RECIPE_NOT_FOUND', 'That recipe does not exist.');
    await this.db.meal.upsert({
      where: { flatId_date: { flatId, date: toDb(date) } },
      create: { id: newId(), flatId, date: toDb(date), name: recipe.name, ingredients: recipe.ingredients },
      update: { name: recipe.name, ingredients: recipe.ingredients, listed: false },
    });
    return this.state(user, flatId);
  }

  async generateGroceries(user: PublicUser, flatId: string, from: IsoDate, to: IsoDate) {
    const s = await this.state(user, flatId);
    const next = addMealsToGroceries(s.meals, s.groceries, from, to, newId);
    const before = new Map(s.groceries.map(g => [g.id, g]));
    await this.db.$transaction(async tx => {
      for (const g of next.groceries) {
        const old = before.get(g.id);
        if (!old) await tx.groceryItem.create({ data: this.groceryRow(flatId, g) });
        else if (JSON.stringify(old) !== JSON.stringify(g)) {
          await tx.groceryItem.update({
            where: { id: g.id },
            data: { qty: g.qty, neededBy: toDb(g.neededBy), forMeals: g.forMeals },
          });
        }
      }
      const listed = next.meals.filter(m => m.listed && !s.meals.find(o => o.id === m.id)?.listed).map(m => m.id);
      await tx.meal.updateMany({ where: { flatId, id: { in: listed } }, data: { listed: true } });
    });
    return this.state(user, flatId);
  }

  async addGrocery(user: PublicUser, flatId: string, input: { name: string; qty: number; unit: string; neededBy: IsoDate }) {
    await this.me(user, flatId);
    await this.db.groceryItem.create({
      data: this.groceryRow(flatId, { id: newId(), ...input, name: input.name.trim(), forMeals: [], bought: false }),
    });
    return this.state(user, flatId);
  }

  async updateGrocery(
    user: PublicUser,
    flatId: string,
    itemId: string,
    patch: { bought?: boolean | undefined; assigneeId?: string | null | undefined },
  ) {
    const s = await this.state(user, flatId);
    if (patch.assigneeId) this.assertMembers(s, [patch.assigneeId]);
    const { count } = await this.db.groceryItem.updateMany({
      where: { id: itemId, flatId },
      data: {
        ...(patch.bought !== undefined && { bought: patch.bought }),
        ...(patch.assigneeId !== undefined && { assigneeId: patch.assigneeId }),
      },
    });
    if (count === 0) throw new AppError('not_found', 'GROCERY_NOT_FOUND', 'That grocery item does not exist.');
    return this.state(user, flatId);
  }

  async assignOpenGroceries(user: PublicUser, flatId: string, assigneeId: string) {
    const s = await this.state(user, flatId);
    this.assertMembers(s, [assigneeId]);
    await this.db.groceryItem.updateMany({ where: { flatId, bought: false, assigneeId: null }, data: { assigneeId } });
    return this.state(user, flatId);
  }

  // ── Tasks ──────────────────────────────────────────────

  async addTask(
    user: PublicUser,
    flatId: string,
    input: { title: string; assignee: string; due: IsoDate; repeatDays?: number | undefined },
  ) {
    const s = await this.state(user, flatId);
    this.assertMembers(s, [input.assignee]);
    await this.db.task.create({
      data: {
        id: newId(),
        flatId,
        title: input.title.trim(),
        assigneeId: input.assignee,
        due: toDb(input.due),
        repeatDays: input.repeatDays ?? null,
      },
    });
    return this.state(user, flatId);
  }

  async setTaskStatus(user: PublicUser, flatId: string, taskId: string, status: Task['status']) {
    const s = await this.state(user, flatId);
    const task = s.tasks.find(t => t.id === taskId);
    if (!task) throw new AppError('not_found', 'TASK_NOT_FOUND', 'That task does not exist.');
    await this.db.$transaction(async tx => {
      await tx.task.update({ where: { id: taskId }, data: { status } });
      if (status !== 'done' || task.status === 'done' || !task.repeatDays) return;
      // Recurring chore: queue the next round for the next flatmate on the rota.
      const due = addDays(task.due, task.repeatDays);
      // Un-ticking and re-ticking must not queue the same round twice.
      const queued = s.tasks.some(t => t.title === task.title && t.due === due && t.repeatDays === task.repeatDays);
      if (queued) return;
      await tx.task.create({
        data: {
          id: newId(),
          flatId,
          title: task.title,
          assigneeId: nextAssignee(s.members, task.assignee, due),
          due: toDb(due),
          repeatDays: task.repeatDays,
        },
      });
    });
    return this.state(user, flatId);
  }

  async deleteTask(user: PublicUser, flatId: string, taskId: string) {
    await this.me(user, flatId);
    const { count } = await this.db.task.deleteMany({ where: { id: taskId, flatId } });
    if (count === 0) throw new AppError('not_found', 'TASK_NOT_FOUND', 'That task does not exist.');
    return this.state(user, flatId);
  }

  // ── Internals ──────────────────────────────────────────

  /** The caller's membership; 404 (not 403) so flat ids can't be probed. */
  private async me(user: PublicUser, flatId: string) {
    const me = await this.db.member.findUnique({ where: { flatId_userId: { flatId, userId: user.id } } });
    if (!me) throw new AppError('not_found', 'FLAT_NOT_FOUND', 'That flat does not exist.');
    return me;
  }

  private async expenseIn(flatId: string, expenseId: string) {
    const e = await this.db.expense.findFirst({ where: { id: expenseId, flatId }, select: { id: true } });
    if (!e) throw new AppError('not_found', 'EXPENSE_NOT_FOUND', 'That expense does not exist.');
  }

  /** Member ids from a request must belong to this flat. */
  private assertMembers(s: FlatState, ids: string[]): Member[] {
    return ids.map(id => {
      const m = s.members.find(x => x.id === id);
      if (!m) throw new AppError('invalid', 'UNKNOWN_MEMBER', 'One of the chosen flatmates is not in this flat.');
      return m;
    });
  }

  private groceryRow(flatId: string, g: GroceryItem) {
    return {
      id: g.id,
      flatId,
      name: g.name,
      qty: g.qty,
      unit: g.unit,
      neededBy: toDb(g.neededBy),
      forMeals: g.forMeals,
      assigneeId: g.assignee ?? null,
      bought: g.bought,
    };
  }

  private async insertExpense(db: Tx | PrismaClient, flatId: string, e: Expense) {
    const ids = new Set([...Object.keys(e.paid), ...Object.keys(e.owed)]);
    await db.expense.create({
      data: {
        id: e.id,
        flatId,
        title: e.title,
        category: e.category,
        amountPaise: e.amount,
        date: toDb(e.date),
        billId: e.billId ?? null,
        shares: {
          create: [...ids].map(memberId => ({
            memberId,
            paidPaise: e.paid[memberId] ?? 0,
            owedPaise: e.owed[memberId] ?? 0,
          })),
        },
      },
    });
  }

  private async load(flatId: string, currentMemberId: string): Promise<FlatState> {
    const flat = await this.db.flat.findUniqueOrThrow({
      where: { id: flatId },
      include: {
        members: { orderBy: { moveIn: 'asc' } },
        expenses: { include: { shares: true }, orderBy: [{ date: 'desc' }, { createdAt: 'desc' }] },
        bills: { orderBy: { dueDate: 'asc' } },
        meals: { orderBy: { date: 'asc' } },
        groceries: true,
        tasks: { orderBy: { due: 'asc' } },
      },
    });
    return {
      version: 1,
      flatName: flat.name,
      currentUserId: currentMemberId,
      members: flat.members.map(m => ({
        id: m.id,
        name: m.name,
        moveIn: fromDb(m.moveIn),
        ...(m.moveOut && { moveOut: fromDb(m.moveOut) }),
      })),
      expenses: flat.expenses.map(e => ({
        id: e.id,
        title: e.title,
        category: e.category as ExpenseCategory,
        amount: e.amountPaise,
        date: fromDb(e.date),
        paid: Object.fromEntries(e.shares.filter(x => x.paidPaise).map(x => [x.memberId, x.paidPaise])),
        owed: Object.fromEntries(e.shares.filter(x => x.owedPaise).map(x => [x.memberId, x.owedPaise])),
        ...(e.billId && { billId: e.billId }),
      })),
      bills: flat.bills.map(b => ({
        id: b.id,
        name: b.name,
        category: b.category as ExpenseCategory,
        amount: b.amountPaise,
        dueDate: fromDb(b.dueDate),
        periodStart: fromDb(b.periodStart),
        periodEnd: fromDb(b.periodEnd),
        status: b.status as Bill['status'],
        ...(b.repeatMonthly && { repeatMonthly: true }),
      })),
      meals: flat.meals.map(
        (m): Meal => ({
          id: m.id,
          date: fromDb(m.date),
          name: m.name,
          ingredients: m.ingredients as Ingredient[],
          listed: m.listed,
        }),
      ),
      groceries: flat.groceries.map(g => ({
        id: g.id,
        name: g.name,
        qty: g.qty,
        unit: g.unit,
        neededBy: fromDb(g.neededBy),
        forMeals: g.forMeals as string[],
        bought: g.bought,
        ...(g.assigneeId && { assignee: g.assigneeId }),
      })),
      tasks: flat.tasks.map(t => ({
        id: t.id,
        title: t.title,
        assignee: t.assigneeId,
        due: fromDb(t.due),
        status: t.status as Task['status'],
        ...(t.repeatDays && { repeatDays: t.repeatDays }),
      })),
    };
  }
}

const isUniqueViolation = (e: unknown) =>
  typeof e === 'object' && e !== null && 'code' in e && (e as { code: unknown }).code === 'P2002';

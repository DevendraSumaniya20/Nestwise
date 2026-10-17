import { Router } from 'express';
import type { AuthService } from '../../../application/auth-service.ts';
import type { FlatService } from '../../../application/flat-service.ts';
import { currentUser, requireAuth } from '../middleware/auth.ts';
import * as s from '../schemas/index.ts';

/** Every mutation answers with the full, fresh flat state. */
export function flatRouter(auth: AuthService, flats: FlatService): Router {
  const r = Router();
  r.use(requireAuth(auth));

  r.get('/recipes', (_req, res) => {
    res.json({ recipes: flats.recipes() });
  });

  r.get('/flats', async (_req, res) => {
    res.json({ flats: await flats.listMine(currentUser(res)) });
  });
  r.post('/flats', async (req, res) => {
    res.status(201).json(await flats.create(currentUser(res), s.createFlatBody.parse(req.body).name));
  });
  r.post('/flats/join', async (req, res) => {
    res.json(await flats.join(currentUser(res), s.joinFlatBody.parse(req.body).code));
  });

  r.get('/flats/:flatId', async (req, res) => {
    res.json(await flats.state(currentUser(res), s.flatParams.parse(req.params).flatId));
  });
  r.get('/flats/:flatId/join-code', async (req, res) => {
    res.json({ code: await flats.joinCode(currentUser(res), s.flatParams.parse(req.params).flatId) });
  });
  r.get('/flats/:flatId/balances', async (req, res) => {
    res.json(await flats.balances(currentUser(res), s.flatParams.parse(req.params).flatId));
  });
  r.get('/flats/:flatId/reminders', async (req, res) => {
    const { flatId } = s.flatParams.parse(req.params);
    res.json({ reminders: await flats.reminders(currentUser(res), flatId, s.remindersQuery.parse(req.query).on) });
  });

  // Members & move-out
  r.post('/flats/:flatId/members', async (req, res) => {
    const { flatId } = s.flatParams.parse(req.params);
    res.status(201).json(await flats.addMember(currentUser(res), flatId, s.addMemberBody.parse(req.body)));
  });
  r.get('/flats/:flatId/members/:memberId/settlement', async (req, res) => {
    const { flatId, memberId } = s.memberParams.parse(req.params);
    res.json(await flats.settlementPreview(currentUser(res), flatId, memberId, s.settlementQuery.parse(req.query).date));
  });
  r.post('/flats/:flatId/members/:memberId/move-out', async (req, res) => {
    const { flatId, memberId } = s.memberParams.parse(req.params);
    res.json(await flats.moveOut(currentUser(res), flatId, memberId, s.moveOutBody.parse(req.body).date));
  });

  r.put('/flats/:flatId/members/:memberId/deposit', async (req, res) => {
    const { flatId, memberId } = s.memberParams.parse(req.params);
    res.json(await flats.setDeposit(currentUser(res), flatId, memberId, s.depositBody.parse(req.body).amount));
  });

  // Pantry & inventory
  r.post('/flats/:flatId/pantry', async (req, res) => {
    const { flatId } = s.flatParams.parse(req.params);
    res.status(201).json(await flats.addPantry(currentUser(res), flatId, s.addPantryBody.parse(req.body)));
  });
  r.patch('/flats/:flatId/pantry/:itemId', async (req, res) => {
    const { flatId, itemId } = s.pantryParams.parse(req.params);
    res.json(await flats.updatePantry(currentUser(res), flatId, itemId, s.updatePantryBody.parse(req.body)));
  });
  r.delete('/flats/:flatId/pantry/:itemId', async (req, res) => {
    const { flatId, itemId } = s.pantryParams.parse(req.params);
    res.json(await flats.deletePantry(currentUser(res), flatId, itemId));
  });
  r.post('/flats/:flatId/inventory', async (req, res) => {
    const { flatId } = s.flatParams.parse(req.params);
    res.status(201).json(await flats.addInventory(currentUser(res), flatId, s.addInventoryBody.parse(req.body)));
  });
  r.delete('/flats/:flatId/inventory/:itemId', async (req, res) => {
    const { flatId, itemId } = s.inventoryParams.parse(req.params);
    res.json(await flats.deleteInventory(currentUser(res), flatId, itemId));
  });

  // Money
  r.post('/flats/:flatId/expenses', async (req, res) => {
    const { flatId } = s.flatParams.parse(req.params);
    res.status(201).json(await flats.addExpense(currentUser(res), flatId, s.addExpenseBody.parse(req.body)));
  });
  r.get('/flats/:flatId/spending', async (req, res) => {
    const { flatId } = s.flatParams.parse(req.params);
    res.json(await flats.spending(currentUser(res), flatId, s.spendingQuery.parse(req.query).month));
  });
  r.get('/flats/:flatId/expenses/:expenseId/comments', async (req, res) => {
    const { flatId, expenseId } = s.expenseParams.parse(req.params);
    res.json({ comments: await flats.comments(currentUser(res), flatId, expenseId) });
  });
  r.post('/flats/:flatId/expenses/:expenseId/comments', async (req, res) => {
    const { flatId, expenseId } = s.expenseParams.parse(req.params);
    const comments = await flats.addComment(currentUser(res), flatId, expenseId, s.commentBody.parse(req.body).body);
    res.status(201).json({ comments });
  });
  r.delete('/flats/:flatId/expenses/:expenseId', async (req, res) => {
    const { flatId, expenseId } = s.expenseParams.parse(req.params);
    res.json(await flats.deleteExpense(currentUser(res), flatId, expenseId));
  });
  r.post('/flats/:flatId/bills', async (req, res) => {
    const { flatId } = s.flatParams.parse(req.params);
    res.status(201).json(await flats.addBill(currentUser(res), flatId, s.addBillBody.parse(req.body)));
  });
  r.post('/flats/:flatId/bills/:billId/pay', async (req, res) => {
    const { flatId, billId } = s.billParams.parse(req.params);
    res.json(await flats.payBill(currentUser(res), flatId, billId, s.payBillBody.parse(req.body)));
  });

  // Meals & groceries
  r.put('/flats/:flatId/meals/:date', async (req, res) => {
    const { flatId, date } = s.mealParams.parse(req.params);
    res.json(await flats.setMeal(currentUser(res), flatId, date, s.setMealBody.parse(req.body).recipe));
  });
  r.post('/flats/:flatId/groceries/generate', async (req, res) => {
    const { flatId } = s.flatParams.parse(req.params);
    const { from, to } = s.generateGroceriesBody.parse(req.body);
    res.json(await flats.generateGroceries(currentUser(res), flatId, from, to));
  });
  r.post('/flats/:flatId/groceries', async (req, res) => {
    const { flatId } = s.flatParams.parse(req.params);
    res.status(201).json(await flats.addGrocery(currentUser(res), flatId, s.addGroceryBody.parse(req.body)));
  });
  r.post('/flats/:flatId/groceries/assign-open', async (req, res) => {
    const { flatId } = s.flatParams.parse(req.params);
    res.json(await flats.assignOpenGroceries(currentUser(res), flatId, s.assignOpenBody.parse(req.body).assigneeId));
  });
  r.patch('/flats/:flatId/groceries/:itemId', async (req, res) => {
    const { flatId, itemId } = s.groceryParams.parse(req.params);
    res.json(await flats.updateGrocery(currentUser(res), flatId, itemId, s.updateGroceryBody.parse(req.body)));
  });

  // Tasks
  r.post('/flats/:flatId/tasks', async (req, res) => {
    const { flatId } = s.flatParams.parse(req.params);
    res.status(201).json(await flats.addTask(currentUser(res), flatId, s.addTaskBody.parse(req.body)));
  });
  r.patch('/flats/:flatId/tasks/:taskId', async (req, res) => {
    const { flatId, taskId } = s.taskParams.parse(req.params);
    res.json(await flats.setTaskStatus(currentUser(res), flatId, taskId, s.taskStatusBody.parse(req.body).status));
  });
  r.delete('/flats/:flatId/tasks/:taskId', async (req, res) => {
    const { flatId, taskId } = s.taskParams.parse(req.params);
    res.json(await flats.deleteTask(currentUser(res), flatId, taskId));
  });
  return r;
}

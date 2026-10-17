// HTTP-level tests against the real app and the local MySQL from .env.
// Every account uses a unique throwaway email and is deleted at the end (cascades to its sessions).
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import { AuthService } from '../application/auth-service.ts';
import { FlatService } from '../application/flat-service.ts';
import { addDays, today } from '../domain/dates.ts';
import { loadEnv } from '../infrastructure/env.ts';
import { createPrismaClient } from '../infrastructure/prisma.ts';
import { createApp } from './app.ts';

const env = loadEnv();
const db = createPrismaClient(env.databaseUrl);
const codes = new Map<string, string>();
const auth = new AuthService(db, env.sessionDays, env.accessMinutes, (email, code) => codes.set(email, code));
const flats = new FlatService(db);
const tag = `it${Date.now()}`;
const emails: string[] = [];
const flatIds: string[] = [];
let base = '';
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

before(async () => {
  server = createApp({ auth, flats }).listen(0);
  await new Promise(r => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
});

after(async () => {
  await db.flat.deleteMany({ where: { id: { in: flatIds } } });
  await db.user.deleteMany({ where: { email: { in: emails } } });
  await db.$disconnect();
  server.close();
});

// Response bodies are loosely typed on purpose: these tests assert on the wire format.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

async function call(method: string, path: string, body?: unknown, token?: string): Promise<{ status: number; body: Json }> {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    ...(body !== undefined && { body: JSON.stringify(body) }),
  });
  return { status: res.status, body: res.status === 204 ? null : await res.json() };
}

async function newUser(name: string): Promise<Json> {
  const email = `${tag}-${name.toLowerCase()}@test.nestwise`;
  emails.push(email);
  const r = await call('POST', '/auth/register', { email, name, password: 'password123' });
  assert.equal(r.status, 201);
  return { email, ...r.body };
}

test('register validates input and rejects duplicate emails', async () => {
  const weak = await call('POST', '/auth/register', { email: `${tag}-x@test.nestwise`, name: 'X', password: 'short' });
  assert.equal(weak.status, 400);
  assert.equal(weak.body.error.code, 'VALIDATION_FAILED');
  const u = await newUser('Dup');
  const again = await call('POST', '/auth/register', { email: u.email.toUpperCase(), name: 'Dup', password: 'password123' });
  assert.equal(again.status, 409);
});

test('login: right password works, wrong one gives one generic error', async () => {
  const u = await newUser('Login');
  assert.equal((await call('POST', '/auth/login', { email: u.email, password: 'password123' })).status, 200);
  const bad = await call('POST', '/auth/login', { email: u.email, password: 'nope-nope' });
  const unknown = await call('POST', '/auth/login', { email: `${tag}-ghost@test.nestwise`, password: 'nope-nope' });
  assert.equal(bad.status, 401);
  assert.deepEqual(bad.body, unknown.body);
});

test('refresh rotates tokens; replaying an old refresh token revokes the session', async () => {
  const u = await newUser('Refresh');
  const r1 = await call('POST', '/auth/refresh', { refreshToken: u.refreshToken });
  assert.equal(r1.status, 200);
  assert.equal((await call('GET', '/me', undefined, u.accessToken)).status, 401);
  assert.equal((await call('GET', '/me', undefined, r1.body.accessToken)).status, 200);
  assert.equal((await call('POST', '/auth/refresh', { refreshToken: u.refreshToken })).status, 401);
  assert.equal((await call('GET', '/me', undefined, r1.body.accessToken)).status, 401);
});

test('forgot/reset password: one-time code, logs out other sessions, no account probing', async () => {
  const u = await newUser('Reset');
  const unknown = await call('POST', '/auth/forgot-password', { email: `${tag}-ghost@test.nestwise` });
  const known = await call('POST', '/auth/forgot-password', { email: u.email });
  assert.deepEqual(unknown, known);
  const code = codes.get(u.email)!;
  const wrong = code === '000000' ? '111111' : '000000';
  assert.equal((await call('POST', '/auth/reset-password', { email: u.email, code: wrong, password: 'newpassword1' })).status, 400);
  const ok = await call('POST', '/auth/reset-password', { email: u.email, code, password: 'newpassword1' });
  assert.equal(ok.status, 200);
  assert.equal((await call('POST', '/auth/reset-password', { email: u.email, code, password: 'again12345' })).status, 400);
  assert.equal((await call('GET', '/me', undefined, u.accessToken)).status, 401);
  assert.equal((await call('POST', '/auth/login', { email: u.email, password: 'newpassword1' })).status, 200);
});

test('flat lifecycle: create, join by code, expenses, bills, groceries, tasks, move-out', async () => {
  const owner = await newUser('Owner');
  const mate = await newUser('Mate');
  const t = (path: string, body?: unknown, method = 'POST', tok = owner.accessToken) => call(method, path, body, tok);

  const created = await t('/flats', { name: 'Test Flat' });
  assert.equal(created.status, 201);
  const { flats: list } = (await t('/flats', undefined, 'GET')).body;
  const flatId = list[0].id;
  flatIds.push(flatId);
  const joined = await call('POST', '/flats/join', { code: list[0].joinCode }, mate.accessToken);
  assert.equal(joined.body.members.length, 2);
  const [o, m] = [joined.body.members.find((x: { name: string }) => x.name === 'Owner').id, joined.body.members.find((x: { name: string }) => x.name === 'Mate').id];

  const exp = await t(`/flats/${flatId}/expenses`, { title: 'Groceries', category: 'Groceries', amount: 100000, paidBy: o, splitAmong: [o, m], date: today() });
  assert.equal(exp.status, 201);
  const bal = (await t(`/flats/${flatId}/balances`, undefined, 'GET')).body;
  assert.deepEqual(bal.balances, { [o]: 50000, [m]: -50000 });
  assert.deepEqual(bal.settleUp, [{ from: m, to: o, amount: 50000 }]);

  const bill = await t(`/flats/${flatId}/bills`, { name: 'Wi-Fi', category: 'Wi-Fi', amount: 80000, dueDate: addDays(today(), 3), periodStart: today(), periodEnd: addDays(today(), 29) });
  const billId = bill.body.bills[0].id;
  const paid = await t(`/flats/${flatId}/bills/${billId}/pay`, { payerId: m, amount: 79900, date: today() });
  assert.equal(paid.body.bills[0].status, 'paid');
  assert.equal((await t(`/flats/${flatId}/bills/${billId}/pay`, { payerId: m, amount: 79900, date: today() })).status, 409);

  await t(`/flats/${flatId}/meals/${today()}`, { recipe: 'Palak Paneer + Roti' }, 'PUT');
  const g = await t(`/flats/${flatId}/groceries/generate`, { from: today(), to: addDays(today(), 6) });
  assert.ok(g.body.groceries.some((x: { name: string }) => x.name === 'Spinach'));
  const assigned = await t(`/flats/${flatId}/groceries/assign-open`, { assigneeId: m });
  assert.ok(assigned.body.groceries.every((x: { assignee?: string }) => x.assignee === m));

  const task = await t(`/flats/${flatId}/tasks`, { title: 'Clean', assignee: m, due: today() });
  const taskId = task.body.tasks[0].id;
  assert.equal((await t(`/flats/${flatId}/tasks/${taskId}`, { status: 'done' }, 'PATCH')).body.tasks[0].status, 'done');

  const out = await t(`/flats/${flatId}/members/${m}/move-out`, { date: today() });
  assert.equal(out.status, 200);
  const after = (await t(`/flats/${flatId}/balances`, undefined, 'GET')).body.balances;
  assert.equal(Object.values(after as Record<string, number>).reduce((a, b) => a + b, 0), 0);
});

test('recurring chores rotate, recurring bills roll over, weighted splits, deletes', async () => {
  const owner = await newUser('Rota');
  const mate = await newUser('RotaMate');
  const t = (path: string, body?: unknown, method = 'POST') => call(method, path, body, owner.accessToken);
  await t('/flats', { name: 'Rota Flat' });
  const { flats: list } = (await t('/flats', undefined, 'GET')).body;
  const flatId = list[0].id;
  flatIds.push(flatId);
  const joined = await call('POST', '/flats/join', { code: list[0].joinCode }, mate.accessToken);
  const [o, m] = ['Rota', 'RotaMate'].map(n => joined.body.members.find((x: { name: string }) => x.name === n).id);
  const f = `/flats/${flatId}`;

  const task = await t(`${f}/tasks`, { title: 'Bins', assignee: o, due: today(), repeatDays: 7 });
  const taskId = task.body.tasks[0].id;
  const done = (await t(`${f}/tasks/${taskId}`, { status: 'done' }, 'PATCH')).body.tasks;
  const next = done.find((x: { id: string }) => x.id !== taskId);
  assert.deepEqual([next.assignee, next.due, next.repeatDays, next.status], [m, addDays(today(), 7), 7, 'pending']);
  // Un-tick and re-tick: still only one next round.
  await t(`${f}/tasks/${taskId}`, { status: 'pending' }, 'PATCH');
  assert.equal((await t(`${f}/tasks/${taskId}`, { status: 'done' }, 'PATCH')).body.tasks.length, 2);
  assert.equal((await t(`${f}/tasks/${next.id}`, undefined, 'DELETE')).body.tasks.length, 1);

  const bill = await t(`${f}/bills`, { name: 'Rent', category: 'Rent', amount: 2000000, dueDate: '2026-10-05', periodStart: '2026-10-01', periodEnd: '2026-10-31', repeatMonthly: true });
  const paid = await t(`${f}/bills/${bill.body.bills[0].id}/pay`, { payerId: o, amount: 2100000, date: today() });
  const rolled = paid.body.bills.find((b: { status: string }) => b.status === 'pending');
  assert.deepEqual([rolled.dueDate, rolled.periodStart, rolled.periodEnd, rolled.amount, rolled.repeatMonthly], ['2026-11-05', '2026-11-01', '2026-11-30', 2100000, true]);
  const billExp = paid.body.expenses[0];
  assert.equal((await t(`${f}/expenses/${billExp.id}`, undefined, 'DELETE')).status, 409);

  const w = await t(`${f}/expenses`, { title: 'Big room', category: 'Other', amount: 90000, paidBy: o, splitAmong: [o, m], weights: { [o]: 2 }, date: today() });
  const e = w.body.expenses.find((x: { title: string }) => x.title === 'Big room');
  assert.deepEqual(e.owed, { [o]: 60000, [m]: 30000 });
  const both = await t(`${f}/expenses`, { title: 'Sofa', category: 'Furniture', amount: 50000, paidBy: o, payers: { [o]: 20000, [m]: 30000 }, splitAmong: [o, m], date: today() });
  const sofa = both.body.expenses.find((x: { title: string }) => x.title === 'Sofa');
  assert.deepEqual(sofa.paid, { [o]: 20000, [m]: 30000 });
  const bad = await t(`${f}/expenses`, { title: 'X', category: 'Other', amount: 100, paidBy: o, payers: { [o]: 50 }, splitAmong: [o], date: today() });
  assert.equal(bad.body.error.code, 'PAYERS_MISMATCH');

  const c = await call('POST', `${f}/expenses/${e.id}/comments`, { body: 'Includes deposit' }, mate.accessToken);
  assert.equal(c.status, 201);
  assert.deepEqual(c.body.comments.map((x: { memberId: string; body: string }) => [x.memberId, x.body]), [[m, 'Includes deposit']]);
  const month = today().slice(0, 7);
  const sp = (await t(`${f}/spending?month=${month}`, undefined, 'GET')).body;
  assert.ok(sp.byCategory.some((x: { category: string }) => x.category === 'Furniture'));
  assert.equal((await t(`${f}/spending?month=2026-13`, undefined, 'GET')).status, 400);

  const gone = await t(`${f}/expenses/${e.id}`, undefined, 'DELETE');
  assert.ok(!gone.body.expenses.some((x: { id: string }) => x.id === e.id));
});

test('deposit buy-out on move-out, pantry restock, inventory', async () => {
  const owner = await newUser('Dep');
  const mate = await newUser('DepMate');
  const t = (path: string, body?: unknown, method = 'POST') => call(method, path, body, owner.accessToken);
  await t('/flats', { name: 'Deposit Flat' });
  const { flats: list } = (await t('/flats', undefined, 'GET')).body;
  const flatId = list[0].id;
  flatIds.push(flatId);
  const joined = await call('POST', '/flats/join', { code: list[0].joinCode }, mate.accessToken);
  const [o, m] = ['Dep', 'DepMate'].map(n => joined.body.members.find((x: { name: string }) => x.name === n).id);
  const f = `/flats/${flatId}`;

  await t(`${f}/members/${m}/deposit`, { amount: 1000000 }, 'PUT');
  const preview = (await t(`${f}/members/${m}/settlement?date=${today()}`, undefined, 'GET')).body;
  assert.deepEqual([preview.deposit, preview.final], [1000000, 1000000]);
  const out = (await t(`${f}/members/${m}/move-out`, { date: today() })).body;
  const me = out.members.find((x: { id: string }) => x.id === o);
  const left = out.members.find((x: { id: string }) => x.id === m);
  assert.deepEqual([me.deposit, left.deposit], [1000000, undefined]);
  // Buy-out credit and payout cancel: everyone is square, the deposit now sits with the stayer.
  assert.deepEqual((await t(`${f}/balances`, undefined, 'GET')).body.balances, { [o]: 0, [m]: 0 });

  const p = (await t(`${f}/pantry`, { name: 'Rice', qty: 5, unit: 'kg', lowAt: 2 })).body;
  assert.equal(p.groceries.length, 0);
  const riceId = p.pantry[0].id;
  const low = (await t(`${f}/pantry/${riceId}`, { qty: 1 }, 'PATCH')).body;
  assert.deepEqual(low.groceries.map((g: { name: string; qty: number }) => [g.name, g.qty]), [['Rice', 3]]);
  // Still low, already listed: not added twice.
  assert.equal((await t(`${f}/pantry/${riceId}`, { qty: 0.5 }, 'PATCH')).body.groceries.length, 1);
  assert.equal((await t(`${f}/pantry/${riceId}`, undefined, 'DELETE')).body.pantry.length, 0);

  const inv = (await t(`${f}/inventory`, { name: 'Sofa', ownerId: o, value: 1500000 })).body.inventory;
  assert.deepEqual([inv[0].name, inv[0].owner, inv[0].value], ['Sofa', o, 1500000]);
  assert.equal((await t(`${f}/inventory/${inv[0].id}`, undefined, 'DELETE')).body.inventory.length, 0);
});

test('authorization: no token, other people’s flats, foreign member ids', async () => {
  const a = await newUser('Alice');
  const b = await newUser('Bob');
  await call('POST', '/flats', { name: 'A Flat' }, a.accessToken);
  const flatId = (await call('GET', '/flats', undefined, a.accessToken)).body.flats[0].id;
  flatIds.push(flatId);
  assert.equal((await call('GET', `/flats/${flatId}`)).status, 401);
  assert.equal((await call('GET', `/flats/${flatId}`, undefined, b.accessToken)).status, 404);
  const foreign = await call('POST', `/flats/${flatId}/tasks`, { title: 'x', assignee: '0'.repeat(32), due: today() }, a.accessToken);
  assert.equal(foreign.status, 400);
  assert.equal(foreign.body.error.code, 'UNKNOWN_MEMBER');
});

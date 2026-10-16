// Demo account: demo@nestwise.app / nestwise123 — "Sunrise Apartment" with 4 flatmates.
import { AuthService } from '../src/application/auth-service.ts';
import { FlatService } from '../src/application/flat-service.ts';
import { addDays } from '../src/domain/dates.ts';
import { RECIPES } from '../src/domain/recipes.ts';
import { loadEnv } from '../src/infrastructure/env.ts';
import { createPrismaClient } from '../src/infrastructure/prisma.ts';

const env = loadEnv();
const db = createPrismaClient(env.databaseUrl);
const auth = new AuthService(db, env.sessionDays, () => {});
const flats = new FlatService(db);
const today = new Date().toISOString().slice(0, 10);

async function main() {
  const email = 'demo@nestwise.app';
  if (await db.user.findUnique({ where: { email } })) {
    console.log('Demo data already present.');
    return;
  }
  const { user } = await auth.register({ email, name: 'Rahul', password: 'nestwise123' });
  let s = await flats.create(user, 'Sunrise Apartment');
  const flatId = (await flats.listMine(user))[0]!.id;
  const moveIn = addDays(today, -120);
  for (const name of ['Amit', 'Jay', 'Karan']) s = await flats.addMember(user, flatId, { name, moveIn });
  const id = (name: string) => s.members.find(m => m.name === name)!.id;
  const all = s.members.map(m => m.id);

  const expenses = [
    ['Rent', 'Rent', 24000, 'Amit', 12],
    ['Weekly groceries', 'Groceries', 2400, 'Rahul', 6],
    ['Cleaning lady', 'Cleaning', 800, 'Jay', 4],
    ['Gas cylinder', 'Gas', 900, 'Karan', 2],
  ] as const;
  for (const [title, category, rupees, by, ago] of expenses) {
    await flats.addExpense(user, flatId, {
      title, category, amount: rupees * 100, paidBy: id(by), splitAmong: all, date: addDays(today, -ago),
    });
  }
  for (const [name, category, rupees, due] of [['Electricity', 'Electricity', 3420, 2], ['Wi-Fi', 'Wi-Fi', 799, 3]] as const) {
    await flats.addBill(user, flatId, {
      name, category, amount: rupees * 100, dueDate: addDays(today, due),
      periodStart: addDays(today, -30), periodEnd: addDays(today, -1),
    });
  }
  for (let i = 0; i < 7; i++) await flats.setMeal(user, flatId, addDays(today, i), RECIPES[i]!.name);
  await flats.addTask(user, flatId, { title: 'Clean kitchen', assignee: id('Jay'), due: addDays(today, 1) });
  await flats.addTask(user, flatId, { title: 'Pay electricity bill', assignee: id('Amit'), due: addDays(today, 2) });
  await flats.addTask(user, flatId, { title: 'Take out recycling', assignee: id('Rahul'), due: today });
  console.log(`Seeded. Log in as ${email} / nestwise123`);
}

main()
  .catch(e => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

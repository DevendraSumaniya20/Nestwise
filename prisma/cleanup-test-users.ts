// Deletes accounts created by API integration and Maestro E2E tests (emails ending @test.nestwise),
// plus any flat left with no members. Real accounts are untouched.
import { loadEnv } from '../src/infrastructure/env.ts';
import { createPrismaClient } from '../src/infrastructure/prisma.ts';

const db = createPrismaClient(loadEnv().databaseUrl);
try {
  const users = await db.user.deleteMany({ where: { email: { endsWith: '@test.nestwise' } } });
  const testMembers = await db.member.findMany({ where: { userId: null, flat: { members: { none: { userId: { not: null } } } } }, select: { flatId: true } });
  const flats = await db.flat.deleteMany({
    where: { OR: [{ members: { none: {} } }, { id: { in: testMembers.map(m => m.flatId) } }] },
  });
  console.log(`Removed ${users.count} test users and ${flats.count} orphaned flats.`);
} finally {
  await db.$disconnect();
}

import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../../generated/prisma/client.ts';

export type { PrismaClient };

export function createPrismaClient(databaseUrl: string): PrismaClient {
  // The mariadb driver only accepts its own scheme; Prisma tooling uses mysql://.
  const url = databaseUrl.replace(/^mysql:\/\//, 'mariadb://');
  return new PrismaClient({ adapter: new PrismaMariaDb(url) });
}

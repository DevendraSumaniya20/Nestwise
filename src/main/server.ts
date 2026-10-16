import { AuthService } from '../application/auth-service.ts';
import { FlatService } from '../application/flat-service.ts';
import { loadEnv } from '../infrastructure/env.ts';
import { createPrismaClient } from '../infrastructure/prisma.ts';
import { createApp } from './app.ts';

function start(): void {
  let env;
  try {
    env = loadEnv();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }

  const db = createPrismaClient(env.databaseUrl);
  // shortcut: reset codes are printed here; wire an SMTP sender before real users.
  const auth = new AuthService(db, env.sessionDays, (email, code) => {
    console.log(`[password-reset] code for ${email}: ${code} (valid 15 minutes)`);
  });
  const app = createApp({ auth, flats: new FlatService(db) });

  // 0.0.0.0 so the Android emulator (10.0.2.2) and phones on the same Wi-Fi can reach it.
  const server = app.listen(env.port, '0.0.0.0', () => {
    console.log(`Nestwise API on http://localhost:${env.port}/api/v1`);
  });

  const stop = (): void => {
    server.close(() => {
      void db.$disconnect().finally(() => process.exit(0));
    });
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

start();

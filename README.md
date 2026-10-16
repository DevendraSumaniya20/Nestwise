# Nestwise API

Express 5 + zod + Prisma 7 on MySQL. Base URL: `http://localhost:4000/api/v1`.

## First-time setup

1. Create the database and user (asks for your MySQL root password):
   ```
   /usr/local/mysql/bin/mysql -u root -p -e "
     CREATE DATABASE IF NOT EXISTS nestwise CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
     CREATE DATABASE IF NOT EXISTS nestwise_shadow CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
     CREATE USER IF NOT EXISTS 'nestwise'@'localhost' IDENTIFIED BY 'nestwise';
     GRANT ALL PRIVILEGES ON nestwise.* TO 'nestwise'@'localhost';
     GRANT ALL PRIVILEGES ON nestwise_shadow.* TO 'nestwise'@'localhost';
     FLUSH PRIVILEGES;"
   ```
2. `cp .env.example .env`
3. `npm install && npm run db:generate && npm run db:migrate -- --name init && npm run db:seed`
4. `npm run dev`

Demo login after seeding: `demo@nestwise.app` / `nestwise123`.
Forgot-password codes are printed in the server terminal (no email yet).

## Endpoints

Auth (rate limited): `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/forgot-password`,
`/auth/reset-password`, `/auth/logout` · `GET /me`.

Login/register/reset return `accessToken` (15 min) + `refreshToken` (30 days). `POST /auth/refresh {refreshToken}`
rotates both; replaying an old refresh token revokes the session.

Everything else needs `Authorization: Bearer <accessToken>`. Flat mutations return the full flat state.

| Area | Endpoints |
|---|---|
| Flats | `GET /flats` · `POST /flats` · `POST /flats/join` · `GET /flats/:id` · `GET /flats/:id/join-code` |
| Money | `POST /flats/:id/expenses` · `GET /flats/:id/balances` (balances + settle-up) |
| Bills | `POST /flats/:id/bills` · `POST /flats/:id/bills/:billId/pay` (split by days lived) |
| Meals | `GET /recipes` · `PUT /flats/:id/meals/:date` |
| Groceries | `POST /flats/:id/groceries/generate` · `POST /flats/:id/groceries` · `PATCH /flats/:id/groceries/:itemId` · `POST /flats/:id/groceries/assign-open` |
| Tasks | `POST /flats/:id/tasks` · `PATCH /flats/:id/tasks/:taskId` |
| Members | `POST /flats/:id/members` · `GET /flats/:id/members/:mid/settlement?date=` · `POST /flats/:id/members/:mid/move-out` |
| Reminders | `GET /flats/:id/reminders?on=YYYY-MM-DD` |

## Layout

`src/domain` pure rules (shared copy of the app's) · `src/application` services ·
`src/infrastructure` env, Prisma, crypto · `src/presentation/http` routes, schemas, middleware · `src/main` server.

# Nestwise — Plan

> Run your flat without the group-chat chaos.

Nestwise is a "flatmate operating system": one shared-home workspace for money,
meals, groceries, tasks, bills and move-in/move-out settlement. Source idea:
a ChatGPT conversation titled "Flatmate App Idea".

The product is the connection between modules, not any single one:

```
Meal plan -> ingredients -> grocery list -> assigned shopper -> reminder
Bills / purchases -> expenses -> balances -> settle up -> move-out settlement
```

## Architecture (clean architecture)

```
src/
  domain/        Pure TypeScript. Entities + business rules. No React, no RN.
    model.ts         Entities (Member, Expense, Bill, Meal, GroceryItem, Task, FlatState)
    money.ts         Paise (integer money), formatting, splits (equal / by occupancy days)
    dates.ts         ISO date helpers (YYYY-MM-DD)
    balances.ts      Net balances + "who pays whom" suggestions
    settlement.ts    Move-out settlement with future-bill estimates + reconciliation
    groceries.ts     Meals -> merged grocery list
    reminders.ts     "Don't let the flat forget" feed
    recipes.ts       Built-in meal library (ingredients per 4 people)
    FlatRepository.ts  Port: load/save FlatState
  data/          Adapters for domain ports.
    AsyncStorageFlatRepository.ts
    seed.ts          Demo flat ("Sunrise Apartment")
  app/           Application layer: state + use-case actions (reducer), React context.
  ui/            Presentation: theme, shared components, screens, tab shell.
```

Rules:
- `domain` imports nothing outside `domain`.
- `data` implements domain ports; `app` depends on domain ports, not on AsyncStorage.
- `ui` talks only to `app` (hooks/actions) and reads domain helpers for display.
- Money is integer paise everywhere. Dates are `YYYY-MM-DD` strings.

## Key rules

- **Expense** stores who paid (`paid`) and who owes (`owed`), both maps of paise.
  Balance = paid − owed. This one shape covers normal expenses, bill payments
  and settlement payouts.
- **Bill paid** -> becomes an expense split by occupancy days in the bill
  period, so someone who left mid-month pays only for their days.
- **Move-out settlement** = current balance − estimated shares of pending bills
  that overlap their stay. Recording it books a payout from remaining members.
  When an estimated bill is later paid at its real amount, the leaver's
  remaining figure becomes the reconciliation adjustment automatically.
- **Grocery generation** merges ingredients (same name + unit) into unbought
  items; `neededBy` = earliest meal date that uses it.
- **Reminders**: groceries needed by tomorrow and not bought, bills due within
  3 days, tasks due by tomorrow — overdue items included.

## Phases

### Phase 1 — MVP (this build, local-only, single device)
- [x] Scaffold RN 0.88 TypeScript app
- [x] Domain layer + unit tests (balances, settlement, groceries, reminders)
- [x] Local persistence (AsyncStorage) + demo seed
- [x] Home dashboard: money, shopping progress, tonight's meal, my tasks, reminders
- [x] Money: balances, settle-up suggestions, expenses, add expense
- [x] Food: weekly meal plan from recipe library, generate grocery list, assign/buy
- [x] Tasks: add, assign, cycle status
- [x] Flat: members (add / move out with settlement), bills (add / pay)
- [x] "Viewing as" switcher (no auth yet)

### Phase 2 — Real notifications + documents
- Local push notifications (e.g. `@notifee/react-native`) scheduled from the reminders feed
- Flat Vault: documents (PDF/image picker), categories, expiry reminders
- Flat inventory (who owns sofa/TV/fridge), pantry with low-stock -> grocery list
- Recurring bills (auto-create monthly)

### Phase 3 — Multi-device
- Backend (auth, flats, invites by link/code), sync, remote push
- Multiple homes per user
- Deposit + rent adjustment in settlement, settlement PDF export

### Phase 4 — AI
- "Plan dinners for 4 under ₹2,500, mostly veg" -> meals -> grocery list -> cost estimate -> assign

## Run

```
npm install
cd ios && bundle install && bundle exec pod install && cd ..
npm run ios      # or: npm run android
npm test
```

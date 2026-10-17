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

## Architecture (clean architecture, folder per concern)

```
src/
  assets/       fonts/ (Montserrat, linked via react-native.config.js), licenses/
  types/        Entities (Member, Expense, Bill, Meal, GroceryItem, Task, FlatState)
  utils/        Pure helpers: dates (YYYY-MM-DD), money (paise, splits)
  services/     Business rules, pure TS: balances, settlement, groceries, reminders,
                FlatRepository port. Unit tested in services/__tests__.
  data/         Adapters + static data: AsyncStorageFlatRepository, seed, recipes
  store/        App state: flatReducer (use-case actions), FlatProvider (context + persistence)
  hooks/        useFlat, useColors
  constants/    colors (light/dark), fonts, sizes (react-native-size-matters `ms`)
  i18n/         Strings (English); useT()
  components/   One file per UI component (Touchable, Button, Card, Chip, Checkbox, Field,
                Icon, Row, Screen, Text, AddCard, Empty) + index barrel
  screens/      Home, Money, Food, Tasks, Flat
  navigation/   RootTabs (React Navigation bottom tabs)
```

Rules:
- `types`, `utils`, `services` never import React or React Native.
- `data` implements service ports; `store` depends on the port, not on AsyncStorage.
- Screens use `hooks`, `components`, `constants`, `i18n` — never raw colours, font names or emoji.
- Every tappable surface goes through `components/Touchable` (ripple + Reanimated press).
- Sizes go through `ms()`; fonts through `constants/fonts`.
- Money is integer paise everywhere. Dates are `YYYY-MM-DD` strings.

## Stack

React Native 0.88 · TypeScript · React Navigation (bottom tabs) · Reanimated 4 + Worklets ·
Gesture Handler · react-native-svg + lucide-react-native icons · react-native-size-matters ·
AsyncStorage · Montserrat.

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
- [x] Recurring bills (paying one creates next month's, estimated at the actual amount)
- [x] Recurring chores with rotation (done → next round, next active flatmate in move-in order)
- [x] Split by shares (unequal splits) and delete expense/task (long-press; bill payments can't be deleted)
- [x] Several payers on one expense; comments on expenses (tap an expense)
- [x] Monthly spending by category and person (`GET /flats/:id/spending?month=YYYY-MM`)
- [x] Appearance: System / Light / Dark (Flat tab), saved on device
- Receipt photos (needs an image picker + file storage)

### Phase 3 — Multi-device
- Backend (auth, flats, invites by link/code), sync, remote push
- Multiple homes per user
- Deposit + rent adjustment in settlement, settlement PDF export

### Phase 4 — AI
- "Plan dinners for 4 under ₹2,500, mostly veg" -> meals -> grocery list -> cost estimate -> assign

## Testing

| Layer | Where | Run |
|---|---|---|
| App unit/component (Jest + RNTL) | `src/**/__tests__` | `npm test` |
| API unit (domain, crypto) | `backend/src/**/*.test.ts` | `cd ../backend && npm test` |
| API integration (real HTTP + MySQL, throwaway users) | `backend/src/main/api.int.test.ts` | `npm run test:int` |
| E2E (Maestro, Android release build) | `.maestro/` | `npm run e2e:build:android && npm run e2e:android` |

E2E needs the API running (`cd ../backend && npm run dev`). Test accounts use `@test.nestwise`
emails; remove them with `cd ../backend && npm run db:cleanup-tests`.

## Run

```
npm install
cd ios && bundle install && bundle exec pod install && cd ..
npm run ios      # or: npm run android
npm test
```

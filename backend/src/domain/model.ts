export type Id = string;
/** Integer money in paise (₹1 = 100). */
export type Paise = number;
/** Calendar date, YYYY-MM-DD. */
export type IsoDate = string;

export type Member = {
  id: Id;
  name: string;
  moveIn: IsoDate;
  moveOut?: IsoDate;
  /** Their part of the security deposit; bought out by the people staying when they leave. */
  deposit?: Paise;
};

export const EXPENSE_CATEGORIES = [
  'Rent',
  'Electricity',
  'Wi-Fi',
  'Water',
  'Gas',
  'Groceries',
  'Food',
  'Cleaning',
  'Maintenance',
  'Furniture',
  'Transport',
  'Settlement',
  'Other',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/** Who put money in (`paid`) and whose share it was (`owed`). Both sum to `amount`. */
export type Expense = {
  id: Id;
  title: string;
  category: ExpenseCategory;
  amount: Paise;
  date: IsoDate;
  paid: Record<Id, Paise>;
  owed: Record<Id, Paise>;
  billId?: Id;
};

export type Bill = {
  id: Id;
  name: string;
  category: ExpenseCategory;
  /** Estimate while pending, actual once paid. */
  amount: Paise;
  dueDate: IsoDate;
  periodStart: IsoDate;
  periodEnd: IsoDate;
  status: 'pending' | 'paid';
  /** When paid, next month's bill is created automatically. */
  repeatMonthly?: boolean;
};

export type Ingredient = { name: string; qty: number; unit: string };

export type Meal = {
  id: Id;
  date: IsoDate;
  name: string;
  ingredients: Ingredient[];
  /** True once its ingredients were added to the grocery list. */
  listed: boolean;
};

export type GroceryItem = {
  id: Id;
  name: string;
  qty: number;
  unit: string;
  neededBy: IsoDate;
  forMeals: string[];
  assignee?: Id;
  bought: boolean;
};

export type TaskStatus = 'pending' | 'in_progress' | 'done';

export type Task = {
  id: Id;
  title: string;
  assignee: Id;
  due: IsoDate;
  status: TaskStatus;
  /** Recurring chore: when done, the next one is due this many days later, rotated to the next flatmate. */
  repeatDays?: number;
};

/** A staple kept at home; at or below `lowAt` it goes on the grocery list. */
export type PantryItem = { id: Id; name: string; qty: number; unit: string; lowAt: number };

/** Furniture or an appliance; no owner = bought together. */
export type InventoryItem = { id: Id; name: string; owner?: Id; value: Paise };

export type FlatState = {
  version: 1;
  flatName: string;
  currentUserId: Id;
  members: Member[];
  expenses: Expense[];
  bills: Bill[];
  meals: Meal[];
  groceries: GroceryItem[];
  tasks: Task[];
  pantry: PantryItem[];
  inventory: InventoryItem[];
};

import type { GroceryItem, Id, IsoDate, Meal } from '../types';

const key = (name: string, unit: string) =>
  `${name.trim().toLowerCase()}|${unit.trim().toLowerCase()}`;

/**
 * Adds ingredients of not-yet-listed meals within [from, to] to the grocery
 * list. Same name + unit merges into an existing unbought item; `neededBy`
 * becomes the earliest meal date needing it.
 */
export function addMealsToGroceries(
  meals: Meal[],
  groceries: GroceryItem[],
  from: IsoDate,
  to: IsoDate,
  newId: () => Id,
): { meals: Meal[]; groceries: GroceryItem[]; added: number } {
  const items = groceries.map(g => ({ ...g, forMeals: [...g.forMeals] }));
  const open = new Map(items.filter(g => !g.bought).map(g => [key(g.name, g.unit), g]));
  let added = 0;
  const nextMeals = meals.map(meal => {
    if (meal.listed || meal.date < from || meal.date > to) return meal;
    for (const ing of meal.ingredients) {
      const existing = open.get(key(ing.name, ing.unit));
      if (existing) {
        existing.qty = round(existing.qty + ing.qty);
        if (meal.date < existing.neededBy) existing.neededBy = meal.date;
        if (!existing.forMeals.includes(meal.name)) existing.forMeals.push(meal.name);
      } else {
        const item: GroceryItem = {
          id: newId(),
          name: ing.name,
          qty: ing.qty,
          unit: ing.unit,
          neededBy: meal.date,
          forMeals: [meal.name],
          bought: false,
        };
        items.push(item);
        open.set(key(ing.name, ing.unit), item);
        added++;
      }
    }
    return { ...meal, listed: true };
  });
  return { meals: nextMeals, groceries: items, added };
}

const round = (n: number) => Math.round(n * 1000) / 1000;

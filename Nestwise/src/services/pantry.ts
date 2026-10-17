import type { GroceryItem, PantryItem } from '../types';

const key = (x: { name: string; unit: string }) => `${x.name.trim().toLowerCase()}|${x.unit.trim().toLowerCase()}`;

/** Pantry items running low that aren't already on the list (unbought) — these get added. */
export function lowStock(pantry: PantryItem[], groceries: GroceryItem[]): PantryItem[] {
  const listed = new Set(groceries.filter(g => !g.bought).map(key));
  return pantry.filter(p => p.qty <= p.lowAt && !listed.has(key(p)));
}

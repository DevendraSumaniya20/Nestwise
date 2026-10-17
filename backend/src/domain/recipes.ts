import type { Ingredient } from './model.ts';

export type Recipe = { name: string; ingredients: Ingredient[] };

const i = (name: string, qty: number, unit: string): Ingredient => ({
  name,
  qty,
  unit,
});

/** Built-in dinners, quantities for 4 people. */
export const RECIPES: Recipe[] = [
  {
    name: 'Dal + Rice + Sabzi',
    ingredients: [
      i('Rice', 0.5, 'kg'),
      i('Toor dal', 0.25, 'kg'),
      i('Potato', 0.5, 'kg'),
      i('Tomato', 0.25, 'kg'),
      i('Onion', 0.25, 'kg'),
    ],
  },
  {
    name: 'Paneer + Roti',
    ingredients: [
      i('Paneer', 0.5, 'kg'),
      i('Atta', 0.5, 'kg'),
      i('Onion', 0.25, 'kg'),
      i('Tomato', 0.25, 'kg'),
    ],
  },
  {
    name: 'Veg Pasta',
    ingredients: [
      i('Pasta', 0.5, 'kg'),
      i('Capsicum', 0.25, 'kg'),
      i('Tomato', 0.5, 'kg'),
      i('Cheese', 0.2, 'kg'),
    ],
  },
  {
    name: 'Rajma + Rice',
    ingredients: [
      i('Rajma', 0.25, 'kg'),
      i('Rice', 0.5, 'kg'),
      i('Onion', 0.25, 'kg'),
      i('Tomato', 0.25, 'kg'),
    ],
  },
  {
    name: 'Veg Pulao + Raita',
    ingredients: [
      i('Rice', 0.5, 'kg'),
      i('Carrot', 0.25, 'kg'),
      i('Beans', 0.25, 'kg'),
      i('Curd', 0.5, 'kg'),
    ],
  },
  {
    name: 'Chole + Roti',
    ingredients: [
      i('Chickpeas', 0.25, 'kg'),
      i('Atta', 0.5, 'kg'),
      i('Onion', 0.25, 'kg'),
      i('Tomato', 0.25, 'kg'),
    ],
  },
  {
    name: 'Palak Paneer + Roti',
    ingredients: [
      i('Spinach', 0.5, 'kg'),
      i('Paneer', 0.25, 'kg'),
      i('Atta', 0.5, 'kg'),
    ],
  },
  {
    name: 'Aloo Paratha + Curd',
    ingredients: [
      i('Potato', 0.75, 'kg'),
      i('Atta', 0.5, 'kg'),
      i('Curd', 0.5, 'kg'),
    ],
  },
];

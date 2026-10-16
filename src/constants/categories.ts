import {
  Car,
  Droplet,
  Flame,
  HandCoins,
  House,
  type LucideIcon,
  Receipt,
  ShoppingCart,
  Sofa,
  Sparkles,
  UtensilsCrossed,
  Wifi,
  Wrench,
  Zap,
} from 'lucide-react-native';
import type { ExpenseCategory } from '../types';

export const categoryIcon: Record<ExpenseCategory, LucideIcon> = {
  Rent: House,
  Electricity: Zap,
  'Wi-Fi': Wifi,
  Water: Droplet,
  Gas: Flame,
  Groceries: ShoppingCart,
  Food: UtensilsCrossed,
  Cleaning: Sparkles,
  Maintenance: Wrench,
  Furniture: Sofa,
  Transport: Car,
  Settlement: HandCoins,
  Other: Receipt,
};

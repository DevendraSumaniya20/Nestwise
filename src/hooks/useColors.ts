import { useColorScheme } from 'react-native';
import { type Colors, dark, light } from '../constants';

export const useColors = (): Colors =>
  useColorScheme() === 'dark' ? dark : light;

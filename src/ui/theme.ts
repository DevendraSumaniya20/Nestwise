import { useColorScheme } from 'react-native';

const light = {
  bg: '#F7F3EC',
  card: '#FFFFFF',
  ink: '#1E2320',
  muted: '#6B706B',
  line: '#E6E0D6',
  accent: '#C4553B',
  accentInk: '#FFFFFF',
  soft: '#F1E7DC',
  good: '#2E7A57',
  bad: '#B83A3A',
  warn: '#B7791F',
};

const dark: typeof light = {
  bg: '#141614',
  card: '#1E211F',
  ink: '#EEEAE3',
  muted: '#9DA29C',
  line: '#2E322F',
  accent: '#E07457',
  accentInk: '#1A0F0B',
  soft: '#2A2622',
  good: '#5DBB8C',
  bad: '#E57373',
  warn: '#E0A84B',
};

export type Colors = typeof light;

export const useColors = (): Colors =>
  useColorScheme() === 'dark' ? dark : light;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
export const radius = 14;

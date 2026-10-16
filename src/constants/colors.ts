export const light = {
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
  ripple: 'rgba(196, 85, 59, 0.16)',
  rippleOnAccent: 'rgba(255, 255, 255, 0.28)',
};

export const dark: typeof light = {
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
  ripple: 'rgba(224, 116, 87, 0.22)',
  rippleOnAccent: 'rgba(0, 0, 0, 0.22)',
};

export type Colors = typeof light;

// Every colour in the app comes from this file.
// Money language: teal = you are owed / lent, orange = you owe / borrowed.

export const light = {
  bg: '#F3F5F6',
  card: '#FFFFFF',
  ink: '#1D2A2F',
  muted: '#6B787D',
  line: '#E2E7E9',
  accent: '#17A589',
  accentInk: '#FFFFFF',
  soft: '#E4F5F0',
  good: '#17A589',
  bad: '#F0642F',
  badSoft: '#FDEBE3',
  warn: '#D9921C',
  ripple: 'rgba(23, 165, 137, 0.16)',
  rippleOnAccent: 'rgba(255, 255, 255, 0.28)',
  scrim: 'rgba(14, 22, 25, 0.45)',
  shadow: '#0E1619',
};

export const dark: typeof light = {
  bg: '#0F1416',
  card: '#182023',
  ink: '#ECF1F2',
  muted: '#93A1A5',
  line: '#263034',
  accent: '#2BC6A2',
  accentInk: '#04231C',
  soft: '#143129',
  good: '#2BC6A2',
  bad: '#FF7B4A',
  badSoft: '#3A2219',
  warn: '#F0B04A',
  ripple: 'rgba(43, 198, 162, 0.22)',
  rippleOnAccent: 'rgba(0, 0, 0, 0.22)',
  scrim: 'rgba(0, 0, 0, 0.6)',
  shadow: '#000000',
};

export type Colors = typeof light;

/** Text on avatars: white reads on every swatch below at this bold, large size. */
export const avatarInk = '#FFFFFF';

/** Avatar backgrounds; a person always gets the same one (hashed from their id). */
export const avatarPalette = ['#17A589', '#5B7BE0', '#E0785B', '#B05BE0', '#D9A21C', '#3E9BC2', '#E05B8F', '#6E8F3A'];

/** Icon colour per expense category; its tile uses the same hue at low opacity. */
export const categoryHue: Record<string, string> = {
  Rent: '#5B7BE0',
  Electricity: '#D9A21C',
  'Wi-Fi': '#3E9BC2',
  Water: '#3E9BC2',
  Gas: '#E0785B',
  Groceries: '#17A589',
  Food: '#E05B8F',
  Cleaning: '#B05BE0',
  Maintenance: '#6B787D',
  Furniture: '#8A6A4A',
  Transport: '#5B7BE0',
  Settlement: '#17A589',
  Other: '#6B787D',
};

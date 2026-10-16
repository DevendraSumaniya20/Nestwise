/** Font file names; Android uses the file name, iOS the PostScript name — identical for these. */
export const font = {
  regular: 'Montserrat-Regular',
  medium: 'Montserrat-Medium',
  semibold: 'Montserrat-SemiBold',
  bold: 'Montserrat-Bold',
  extrabold: 'Montserrat-ExtraBold',
} as const;
export type FontWeight = keyof typeof font;

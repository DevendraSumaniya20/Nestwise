import { moderateScale } from 'react-native-size-matters';

/** Scales a design size (375pt-wide baseline) to the device, damped so tablets don't balloon. */
export const ms = (size: number) => moderateScale(size, 0.3);

export const space = { xs: ms(4), sm: ms(8), md: ms(12), lg: ms(16), xl: ms(24) };
export const radius = ms(14);
export const iconSize = { sm: ms(16), md: ms(20), lg: ms(24) };

/** Design font sizes; pass through `ms` at use. */
export const fontSize = { caption: 11, small: 13, body: 15, label: 14, input: 16, title: 17, stat: 24, h1: 28 };

import React from 'react';
import { Text } from 'react-native';
import { font, type FontWeight, ms } from '../constants';
import { useColors } from '../hooks/useColors';

/** Text in Montserrat; `size` is a design size, scaled to the device. */
export function T({
  children,
  muted,
  strong,
  weight,
  size = 15,
  color,
}: {
  children: React.ReactNode;
  muted?: boolean;
  /** Shorthand for weight="bold". */
  strong?: boolean;
  weight?: FontWeight;
  size?: number;
  color?: string;
}) {
  const c = useColors();
  return (
    <Text
      style={{
        color: color ?? (muted ? c.muted : c.ink),
        fontSize: ms(size),
        fontFamily: font[weight ?? (strong ? 'bold' : 'regular')],
      }}
    >
      {children}
    </Text>
  );
}

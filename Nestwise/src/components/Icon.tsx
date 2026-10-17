import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { iconSize, ms } from '../constants';
import { useColors } from '../hooks/useColors';

/** SVG icon tinted from the theme; `color` overrides, default is ink. */
export function Icon({ as: Svg, size = 'md', color }: { as: LucideIcon; size?: keyof typeof iconSize; color?: string }) {
  const c = useColors();
  return <Svg size={iconSize[size]} color={color ?? c.ink} strokeWidth={2} />;
}

/** Icon on a soft circle, used at the start of list rows. */
export function IconBadge({ as, color }: { as: LucideIcon; color: string }) {
  const c = useColors();
  return (
    <View style={[styles.badge, { backgroundColor: c.soft }]}>
      <Icon as={as} size="sm" color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { width: ms(36), height: ms(36), borderRadius: ms(18), alignItems: 'center', justifyContent: 'center' },
});

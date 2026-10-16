import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import { font, ms, space } from '../constants';
import { useColors } from '../hooks/useColors';
import { Icon } from './Icon';
import { Touchable } from './Touchable';

export function Button({
  title,
  onPress,
  kind = 'primary',
  disabled,
  icon,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost';
  disabled?: boolean;
  icon?: LucideIcon;
}) {
  const c = useColors();
  const primary = kind === 'primary';
  const ink = primary ? c.accentInk : c.ink;
  return (
    <Touchable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      rippleColor={primary ? c.rippleOnAccent : c.ripple}
      style={[styles.button, { backgroundColor: primary ? c.accent : c.soft, opacity: disabled ? 0.45 : 1 }]}
    >
      {icon ? <Icon as={icon} size="sm" color={ink} /> : null}
      <Text style={[styles.text, { color: ink }]}>{title}</Text>
    </Touchable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    gap: space.sm,
    borderRadius: 999,
    paddingVertical: ms(11),
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  text: { fontSize: ms(15), fontFamily: font.bold },
});

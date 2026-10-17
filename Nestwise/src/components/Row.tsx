import React from 'react';
import { StyleSheet, View } from 'react-native';
import { space } from '../constants';
import { useColors } from '../hooks/useColors';
import { Touchable } from './Touchable';

export function Row({
  children,
  onPress,
  onLongPress,
  label,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  label?: string;
}) {
  const c = useColors();
  return onPress || onLongPress ? (
    <Touchable onPress={onPress} onLongPress={onLongPress} accessibilityRole="button" accessibilityLabel={label} pressScale={0.99} style={[styles.row, { borderColor: c.line }]}>
      {children}
    </Touchable>
  ) : (
    <View style={[styles.row, { borderColor: c.line }]}>{children}</View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
});

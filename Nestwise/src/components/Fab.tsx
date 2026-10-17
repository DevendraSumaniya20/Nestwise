import type { LucideIcon } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { font, ms, space } from '../constants';
import { useColors } from '../hooks/useColors';
import { Icon } from './Icon';
import { Touchable } from './Touchable';

/** Floating action button, bottom-right; fades in and out with its screen. */
export function Fab({ label, icon, onPress }: { label: string; icon: LucideIcon; onPress: () => void }) {
  const c = useColors();
  return (
    <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(200)} style={styles.wrap} pointerEvents="box-none">
      <Touchable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={label}
        rippleColor={c.rippleOnAccent}
        pressScale={1}
        style={[styles.fab, { backgroundColor: c.accent, shadowColor: c.shadow }]}
      >
        <Icon as={icon} size="md" color={c.accentInk} />
        <Text style={[styles.label, { color: c.accentInk }]}>{label}</Text>
      </Touchable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: space.lg, bottom: space.lg },
  fab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.lg,
    height: ms(52),
    borderRadius: 999,
    elevation: 6,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  label: { fontFamily: font.bold, fontSize: ms(15) },
});

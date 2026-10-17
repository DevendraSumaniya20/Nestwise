import { Check } from 'lucide-react-native';
import React from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { ms } from '../constants';
import { useColors } from '../hooks/useColors';
import { Icon } from './Icon';
import { Touchable } from './Touchable';

export function Checkbox({ checked, onPress, label }: { checked: boolean; onPress: () => void; label: string }) {
  const c = useColors();
  return (
    <Touchable
      onPress={onPress}
      pressScale={1}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      hitSlop={8}
      style={[styles.check, { borderColor: checked ? c.good : c.line }, checked && { backgroundColor: c.good }]}
    >
      {checked ? (
        <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(120)}>
          <Icon as={Check} size="sm" color={c.card} />
        </Animated.View>
      ) : null}
    </Touchable>
  );
}

const styles = StyleSheet.create({
  check: { width: ms(28), height: ms(28), borderRadius: ms(8), borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});

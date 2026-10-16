import React from 'react';
import {
  type GestureResponderEvent,
  type LayoutChangeEvent,
  Platform,
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useColors } from '../hooks/useColors';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const IOS = Platform.OS === 'ios';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  rippleColor?: string;
  /** Scale while pressed; 1 disables the squeeze. */
  pressScale?: number;
};

/**
 * Every tappable surface: Material ripple (native on Android, Reanimated on
 * iOS, which has none) plus a small spring squeeze. Reduce Motion is honoured
 * by Reanimated's default ReduceMotion.System.
 */
export function Touchable({
  style,
  children,
  rippleColor,
  pressScale = 0.97,
  onPressIn,
  onPressOut,
  onLayout,
  ...rest
}: Props) {
  const c = useColors();
  const color = rippleColor ?? c.ripple;
  const pressed = useSharedValue(0);
  const grow = useSharedValue(0);
  const fade = useSharedValue(0);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const r = useSharedValue(0);
  const w = useSharedValue(0);
  const h = useSharedValue(0);

  const squeeze = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - (1 - pressScale) * pressed.value }],
  }));
  const ripple = useAnimatedStyle(() => ({
    left: x.value - r.value,
    top: y.value - r.value,
    width: r.value * 2,
    height: r.value * 2,
    borderRadius: r.value,
    opacity: fade.value,
    transform: [{ scale: grow.value }],
  }));

  const handleIn = (e: GestureResponderEvent) => {
    pressed.value = withSpring(1, { damping: 20, stiffness: 400 });
    if (IOS) {
      const { locationX, locationY } = e.nativeEvent;
      x.value = locationX;
      y.value = locationY;
      // Radius reaching the farthest corner so the wave fills the surface.
      r.value = Math.hypot(Math.max(locationX, w.value - locationX), Math.max(locationY, h.value - locationY));
      grow.value = 0;
      fade.value = 1;
      grow.value = withTiming(1, { duration: 380 });
    }
    onPressIn?.(e);
  };
  const handleOut = (e: GestureResponderEvent) => {
    pressed.value = withSpring(0, { damping: 15, stiffness: 300 });
    if (IOS) fade.value = withTiming(0, { duration: 320 });
    onPressOut?.(e);
  };
  const handleLayout = (e: LayoutChangeEvent) => {
    w.value = e.nativeEvent.layout.width;
    h.value = e.nativeEvent.layout.height;
    onLayout?.(e);
  };

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={handleIn}
      onPressOut={handleOut}
      onLayout={handleLayout}
      android_ripple={{ color, foreground: true }}
      style={[styles.clip, style, squeeze]}
    >
      {IOS ? <Animated.View pointerEvents="none" style={[styles.ripple, { backgroundColor: color }, ripple]} /> : null}
      {children}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  ripple: { position: 'absolute' },
});

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { font, ms, radius, space } from '../constants';
import { useColors } from '../hooks/useColors';

export function Card({ title, children, action }: { title?: string; children: React.ReactNode; action?: React.ReactNode }) {
  const c = useColors();
  return (
    <Animated.View
      entering={FadeInDown.duration(320)}
      layout={LinearTransition.duration(220)}
      style={[styles.card, { backgroundColor: c.card, borderColor: c.line }]}
    >
      {title || action ? (
        <View style={styles.head}>
          {title ? <Text style={[styles.title, { color: c.muted }]}>{title.toUpperCase()}</Text> : <View />}
          {action}
        </View>
      ) : null}
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius, borderWidth: StyleSheet.hairlineWidth, padding: space.lg, gap: space.sm },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: ms(11), fontFamily: font.bold, letterSpacing: 0.9 },
});

import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, ms, space } from '../constants';
import { useColors } from '../hooks/useColors';

export function Screen({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={[styles.screen, { paddingTop: insets.top + space.md }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={styles.flex}>
          {subtitle ? <Text style={[styles.eyebrow, { color: c.muted }]}>{subtitle}</Text> : null}
          <Text style={[styles.title, { color: c.ink }]} accessibilityRole="header">
            {title}
          </Text>
        </View>
        {right}
      </View>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { padding: space.lg, paddingBottom: ms(32), gap: space.md },
  header: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: space.sm },
  flex: { flex: 1 },
  eyebrow: { fontSize: ms(13), fontFamily: font.semibold, letterSpacing: 0.3 },
  title: { fontSize: ms(28), fontFamily: font.extrabold, letterSpacing: -0.5 },
});

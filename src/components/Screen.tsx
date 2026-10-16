import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, ms, space } from '../constants';
import { useColors } from '../hooks/useColors';

export function Screen({
  title,
  subtitle,
  right,
  children,
  onRefresh,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  /** Enables pull-to-refresh. */
  onRefresh?: () => Promise<unknown>;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { refreshing, refresh } = useRefresh(onRefresh);
  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={[styles.screen, { paddingTop: insets.top + space.md }]}
      keyboardShouldPersistTaps="handled"
      refreshControl={refresh ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.accent} colors={[c.accent]} /> : undefined}
    >
      <ScreenHeader title={title} subtitle={subtitle} right={right} />
      {children}
    </ScrollView>
  );
}

export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={styles.header}>
      <View style={styles.flex}>
        {subtitle ? <Text style={[styles.eyebrow, { color: c.muted }]}>{subtitle}</Text> : null}
        <Text style={[styles.title, { color: c.ink }]} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

/** Pull-to-refresh state for a screen-level scroller. */
export function useRefresh(onRefresh?: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);
  const refresh = onRefresh
    ? () => {
        setRefreshing(true);
        onRefresh()
          .catch(() => {})
          .finally(() => setRefreshing(false));
      }
    : undefined;
  return { refreshing, refresh };
}

const styles = StyleSheet.create({
  screen: { padding: space.lg, paddingBottom: ms(32), gap: space.md },
  header: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: space.sm },
  flex: { flex: 1 },
  eyebrow: { fontSize: ms(13), fontFamily: font.semibold, letterSpacing: 0.3 },
  title: { fontSize: ms(28), fontFamily: font.extrabold, letterSpacing: -0.5 },
});

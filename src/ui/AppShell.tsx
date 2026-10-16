import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FlatScreen } from './screens/FlatScreen';
import { FoodScreen } from './screens/FoodScreen';
import { HomeScreen } from './screens/HomeScreen';
import { MoneyScreen } from './screens/MoneyScreen';
import { TasksScreen } from './screens/TasksScreen';
import { useColors } from './theme';

// shortcut: in-house tabs instead of react-navigation; switch once screens need stacks/deep links.
const TABS = [
  { key: 'home', label: 'Home', icon: '🏠', Screen: HomeScreen },
  { key: 'money', label: 'Money', icon: '💰', Screen: MoneyScreen },
  { key: 'food', label: 'Food', icon: '🍽️', Screen: FoodScreen },
  { key: 'tasks', label: 'Tasks', icon: '✅', Screen: TasksScreen },
  { key: 'flat', label: 'Flat', icon: '🚪', Screen: FlatScreen },
] as const;

export function AppShell() {
  const [tab, setTab] = useState<(typeof TABS)[number]['key']>('home');
  const c = useColors();
  const insets = useSafeAreaInsets();
  const Current = TABS.find(t => t.key === tab)!.Screen;

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <Current />
      <View
        accessibilityRole="tablist"
        style={[styles.bar, { backgroundColor: c.card, borderColor: c.line, paddingBottom: insets.bottom + 6 }]}
      >
        {TABS.map(t => {
          const selected = t.key === tab;
          return (
            <Pressable
              key={t.key}
              onPress={() => setTab(t.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={t.label}
              style={styles.tab}
            >
              <Text style={styles.icon}>{t.icon}</Text>
              <Text style={[styles.label, { color: selected ? c.accent : c.muted, fontWeight: selected ? '700' : '500' }]}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  tab: { flex: 1, alignItems: 'center', minHeight: 48, justifyContent: 'center' },
  icon: { fontSize: 20 },
  label: { fontSize: 12, marginTop: 2 },
});

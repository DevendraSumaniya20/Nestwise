import { CircleCheck, ShoppingCart, Zap } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { netBalances } from '../services/balances';
import { relativeDay } from '../utils/dates';
import { formatInr } from '../utils/money';
import { reminders } from '../services/reminders';
import { Card, Empty, IconBadge, Row, Screen, T } from '../components';
import { space } from '../constants';
import { useColors, useFlat } from '../hooks';
import { useT } from '../i18n';

const ICON = { grocery: ShoppingCart, bill: Zap, task: CircleCheck } as const;

export function HomeScreen() {
  const t = useT();
  const { state, today, me, active, nameOf, refresh } = useFlat();
  const c = useColors();
  const month = today.slice(0, 7);
  const spent = state.expenses
    .filter(e => e.date.startsWith(month) && e.category !== 'Settlement')
    .reduce((s, e) => s + e.amount, 0);
  const myNet = netBalances(state.expenses, [me.id])[me.id] ?? 0;
  const open = state.groceries.filter(g => !g.bought);
  const bought = state.groceries.length - open.length;
  const tonight = state.meals.find(m => m.date === today);
  const myTasks = state.tasks.filter(t => t.assignee === me.id && t.status !== 'done');
  const feed = reminders(state, today).filter(r => !r.for || r.for === me.id);

  return (
    <Screen title={state.flatName} subtitle={t.home.subtitle(active.length, me.name)} onRefresh={refresh}>
      <Card title={t.home.dontForget}>
        {feed.length === 0 ? (
          <Empty>{t.home.allClear}</Empty>
        ) : (
          feed.map(r => (
            <Row key={r.id}>
              <IconBadge as={ICON[r.kind]} color={r.inDays < 0 ? c.bad : r.kind === 'bill' ? c.warn : c.accent} />
              <View style={styles.flex}>
                <T strong color={r.inDays < 0 ? c.bad : undefined}>{r.title}</T>
                <T muted size={13}>{r.detail}{r.for ? ` · ${nameOf(r.for)}` : ''}</T>
              </View>
            </Row>
          ))
        )}
      </Card>

      <Card title={t.home.money}>
        <T muted>{t.home.thisMonth}</T>
        <T size={28} strong>{formatInr(spent)}</T>
        <T strong color={myNet > 0 ? c.good : myNet < 0 ? c.bad : c.muted}>
          {myNet > 0 ? `You are owed ${formatInr(myNet)}` : myNet < 0 ? `You owe ${formatInr(-myNet)}` : 'You are all settled'}
        </T>
      </Card>

      <View style={styles.pair}>
        <View style={styles.flex}>
          <Card title={t.home.shopping}>
            <T size={24} strong>{bought}/{state.groceries.length}</T>
            <T muted size={13}>{open.length ? `${open.length} items pending` : 'List is clear'}</T>
          </Card>
        </View>
        <View style={styles.flex}>
          <Card title={t.home.tonight}>
            <T strong>{tonight?.name ?? t.home.notPlanned}</T>
          </Card>
        </View>
      </View>

      <Card title={t.home.yourTasks}>
        {myTasks.length === 0 ? (
          <Empty>{t.home.noTasks}</Empty>
        ) : (
          myTasks.map(t => (
            <Row key={t.id}>
              <View style={styles.flex}>
                <T>{t.title}</T>
                <T muted size={13}>Due {relativeDay(t.due, today)}</T>
              </View>
            </Row>
          ))
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  pair: { flexDirection: 'row', gap: space.md },
});

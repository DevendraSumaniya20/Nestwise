import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useFlat } from '../../app/FlatProvider';
import { netBalances } from '../../domain/balances';
import { relativeDay } from '../../domain/dates';
import { formatInr } from '../../domain/money';
import { reminders } from '../../domain/reminders';
import { Card, Chip, Chips, Empty, Row, Screen, T } from '../components';
import { space, useColors } from '../theme';

const ICON = { grocery: '🛒', bill: '💡', task: '✅' } as const;

export function HomeScreen() {
  const { state, dispatch, today, me, active, nameOf } = useFlat();
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
    <Screen title={state.flatName} subtitle={`${active.length} flatmates · viewing as ${me.name}`}>
      <Chips>
        {active.map(m => (
          <Chip key={m.id} label={m.name} selected={m.id === me.id} onPress={() => dispatch({ type: 'setCurrentUser', id: m.id })} />
        ))}
      </Chips>

      <Card title="Don't forget">
        {feed.length === 0 ? (
          <Empty>Nothing urgent. The flat is on top of things.</Empty>
        ) : (
          feed.map(r => (
            <Row key={r.id}>
              <T size={20}>{ICON[r.kind]}</T>
              <View style={styles.flex}>
                <T strong color={r.inDays < 0 ? c.bad : undefined}>{r.title}</T>
                <T muted size={13}>{r.detail}{r.for ? ` · ${nameOf(r.for)}` : ''}</T>
              </View>
            </Row>
          ))
        )}
      </Card>

      <Card title="Money">
        <T muted>This month</T>
        <T size={28} strong>{formatInr(spent)}</T>
        <T strong color={myNet > 0 ? c.good : myNet < 0 ? c.bad : c.muted}>
          {myNet > 0 ? `You are owed ${formatInr(myNet)}` : myNet < 0 ? `You owe ${formatInr(-myNet)}` : 'You are all settled'}
        </T>
      </Card>

      <View style={styles.pair}>
        <View style={styles.flex}>
          <Card title="Shopping">
            <T size={24} strong>{bought}/{state.groceries.length}</T>
            <T muted size={13}>{open.length ? `${open.length} items pending` : 'List is clear'}</T>
          </Card>
        </View>
        <View style={styles.flex}>
          <Card title="Tonight">
            <T strong>{tonight?.name ?? 'Not planned'}</T>
          </Card>
        </View>
      </View>

      <Card title="Your tasks">
        {myTasks.length === 0 ? (
          <Empty>No open tasks for you.</Empty>
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

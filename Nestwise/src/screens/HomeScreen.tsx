import { CircleCheck, ShoppingCart, Zap } from 'lucide-react-native';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AnimatedAmount, Avatar, Card, Empty, IconBadge, Row, Screen, T } from '../components';
import { font, ms, space } from '../constants';
import { useColors, useFlat } from '../hooks';
import { useT } from '../i18n';
import { myDebts, netBalances, settleUp } from '../services/balances';
import { reminders } from '../services/reminders';
import { relativeDay } from '../utils/dates';
import { formatInr } from '../utils/money';

const MAX_REMINDERS = 5;
const ICON = { grocery: ShoppingCart, bill: Zap, task: CircleCheck } as const;
/** Rows cascade in, capped so long lists don't keep you waiting. */
const cascade = (i: number) => FadeIn.delay(Math.min(i, 8) * 45).duration(250);

export function HomeScreen() {
  const t = useT();
  const c = useColors();
  const { state, today, me, active, nameOf, refresh } = useFlat();

  const net = useMemo(() => netBalances(state.expenses, state.members.map(m => m.id)), [state]);
  const debts = useMemo(() => myDebts(settleUp(net), me.id), [net, me.id]);
  const myNet = net[me.id] ?? 0;
  const month = today.slice(0, 7);
  const spent = state.expenses
    .filter(e => e.date.startsWith(month) && e.category !== 'Settlement')
    .reduce((s, e) => s + e.amount, 0);
  const open = state.groceries.filter(g => !g.bought);
  const bought = state.groceries.length - open.length;
  const tonight = state.meals.find(m => m.date === today);
  const myTasks = state.tasks.filter(x => x.assignee === me.id && x.status !== 'done');
  const feed = reminders(state, today).filter(r => !r.for || r.for === me.id);
  const flatmates = active.filter(m => m.id !== me.id);

  return (
    <Screen title={state.flatName} subtitle={t.home.subtitle(active.length, me.name)} onRefresh={refresh}>
      <Card>
        <T muted>{myNet > 0 ? 'Overall, you are owed' : myNet < 0 ? 'Overall, you owe' : 'You are all settled up'}</T>
        {myNet !== 0 ? <AnimatedAmount value={Math.abs(myNet)} style={[styles.hero, { color: myNet > 0 ? c.good : c.bad }]} /> : null}
        <T muted size={13}>
          {`${formatInr(spent)} spent by the flat this month`}
        </T>
        {flatmates.map((m, i) => {
          const d = debts.find(x => x.other === m.id);
          return (
            <Animated.View key={m.id} entering={cascade(i)}>
              <Row>
                <Avatar id={m.id} name={m.name} size={36} />
                <View style={styles.flex}>
                  <T weight="medium">{m.name}</T>
                </View>
                {d ? (
                  <View style={styles.right}>
                    <T size={11} color={d.owesMe ? c.good : c.bad}>{d.owesMe ? 'owes you' : 'you owe'}</T>
                    <T strong color={d.owesMe ? c.good : c.bad}>{formatInr(d.amount)}</T>
                  </View>
                ) : (
                  <T muted size={13}>settled up</T>
                )}
              </Row>
            </Animated.View>
          );
        })}
      </Card>

      <Card title={t.home.dontForget}>
        {feed.length === 0 ? (
          <Empty>{t.home.allClear}</Empty>
        ) : (
          feed.slice(0, MAX_REMINDERS).map((r, i) => (
            <Animated.View key={r.id} entering={cascade(i)}>
              <Row>
                <IconBadge as={ICON[r.kind]} color={r.inDays < 0 ? c.bad : r.kind === 'bill' ? c.warn : c.accent} />
                <View style={styles.flex}>
                  <T strong color={r.inDays < 0 ? c.bad : undefined}>{r.title}</T>
                  <T muted size={13}>{r.detail}{r.for ? ` · ${nameOf(r.for)}` : ''}</T>
                </View>
              </Row>
            </Animated.View>
          ))
        )}
        {feed.length > MAX_REMINDERS ? <T muted size={13}>+{feed.length - MAX_REMINDERS} more on the Food and Tasks tabs</T> : null}
      </Card>

      <View style={styles.pair}>
        <View style={styles.flex}>
          <Card title={t.home.shopping}>
            <T size={24} strong>{bought}/{state.groceries.length}</T>
            <Progress value={state.groceries.length ? bought / state.groceries.length : 0} />
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
          myTasks.map((task, i) => (
            <Animated.View key={task.id} entering={cascade(i)}>
              <Row>
                <View style={styles.flex}>
                  <T>{task.title}</T>
                  <T muted size={13} color={task.due < today ? c.bad : undefined}>Due {relativeDay(task.due, today)}</T>
                </View>
              </Row>
            </Animated.View>
          ))
        )}
      </Card>
    </Screen>
  );
}

/** Thin bar that grows to the new value. */
function Progress({ value }: { value: number }) {
  const c = useColors();
  const w = useSharedValue(0);
  useEffect(() => {
    w.value = withTiming(value, { duration: 600 });
  }, [value, w]);
  const fill = useAnimatedStyle(() => ({ width: `${w.value * 100}%` }));
  return (
    <View style={[styles.track, { backgroundColor: c.soft }]} accessibilityLabel={`${Math.round(value * 100)}% bought`}>
      <Animated.View style={[styles.fill, { backgroundColor: c.accent }, fill]} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  right: { alignItems: 'flex-end' },
  pair: { flexDirection: 'row', gap: space.md },
  hero: { fontFamily: font.extrabold, fontSize: ms(32), letterSpacing: -0.5 },
  track: { height: ms(6), borderRadius: ms(3), overflow: 'hidden' },
  fill: { height: '100%', borderRadius: ms(3) },
});

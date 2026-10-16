import { HandCoins, Plus, Scale } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AnimatedAmount,
  Avatar,
  Button,
  Card,
  CategoryTile,
  Chip,
  Chips,
  DateBlock,
  Empty,
  ErrorText,
  Fab,
  Field,
  Label,
  ListScreen,
  MemberPicker,
  Row,
  Sheet,
  T,
} from '../components';
import { font, ms, space } from '../constants';
import { useColors, useFlat } from '../hooks';
import { useT } from '../i18n';
import { myDebts, myShare, netBalances, settleUp } from '../services/balances';
import { EXPENSE_CATEGORIES, type Expense, type ExpenseCategory } from '../types';
import { isIsoDate } from '../utils/dates';
import { formatInr, parseRupees } from '../utils/money';

type Item = { kind: 'month'; key: string; label: string } | { kind: 'expense'; key: string; e: Expense };

const MONTHS = 'January February March April May June July August September October November December'.split(' ');
const monthLabel = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;

export function MoneyScreen() {
  const t = useT();
  const c = useColors();
  const { state, me, nameOf, refresh } = useFlat();
  const [sheet, setSheet] = useState<null | 'add' | 'settle' | 'balances'>(null);
  const close = () => setSheet(null);

  const net = useMemo(() => netBalances(state.expenses, state.members.map(m => m.id)), [state]);
  const transfers = useMemo(() => settleUp(net), [net]);
  const mine = myDebts(transfers, me.id);
  const myNet = net[me.id] ?? 0;

  // Splitwise-style: expenses grouped under month headings, newest first.
  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    let month = '';
    for (const e of state.expenses) {
      const m = e.date.slice(0, 7);
      if (m !== month) {
        month = m;
        out.push({ kind: 'month', key: `m-${m}`, label: monthLabel(e.date) });
      }
      out.push({ kind: 'expense', key: e.id, e });
    }
    return out;
  }, [state.expenses]);

  const summary = (
    <Card>
      <T muted>{myNet > 0 ? 'Overall, you are owed' : myNet < 0 ? 'Overall, you owe' : 'You are all settled up'}</T>
      {myNet !== 0 ? (
        <AnimatedAmount value={Math.abs(myNet)} style={[styles.hero, { color: myNet > 0 ? c.good : c.bad }]} />
      ) : null}
      {mine.map(d => (
        <Row key={d.other}>
          <Avatar id={d.other} name={nameOf(d.other)} size={32} />
          <View style={styles.flex}>
            <T>{d.owesMe ? `${nameOf(d.other)} owes you` : `You owe ${nameOf(d.other)}`}</T>
          </View>
          <T strong color={d.owesMe ? c.good : c.bad}>{formatInr(d.amount)}</T>
        </Row>
      ))}
      <View style={styles.actions}>
        <View style={styles.flex}>
          <Button title="Settle up" icon={HandCoins} onPress={() => setSheet('settle')} />
        </View>
        <View style={styles.flex}>
          <Button kind="ghost" title="Balances" icon={Scale} onPress={() => setSheet('balances')} />
        </View>
      </View>
    </Card>
  );

  return (
    <View style={styles.flex}>
      <ListScreen
        title={t.money.title}
        subtitle={state.flatName}
        onRefresh={refresh}
        header={summary}
        listTitle={t.money.expenses}
        emptyText={t.money.none}
        data={items}
        keyExtractor={i => i.key}
        getItemType={i => i.kind}
        bottomInset={ms(72)}
        renderItem={i => (i.kind === 'month' ? <MonthHeading label={i.label} /> : <ExpenseRow e={i.e} />)}
      />
      <Fab label={t.money.add} icon={Plus} onPress={() => setSheet('add')} />

      <Sheet visible={sheet === 'add'} title={t.money.add} onClose={close}>
        <AddExpense onDone={close} />
      </Sheet>
      <Sheet visible={sheet === 'settle'} title="Settle up" onClose={close}>
        <SettleUp onDone={close} />
      </Sheet>
      <Sheet visible={sheet === 'balances'} title={t.money.balances} onClose={close}>
        {state.members
          .filter(m => !m.moveOut || net[m.id] !== 0)
          .map(m => (
            <Row key={m.id}>
              <Avatar id={m.id} name={m.name} size={36} faded={!!m.moveOut} />
              <View style={styles.flex}>
                <T>{m.id === me.id ? `${m.name} (you)` : m.name}</T>
                {m.moveOut ? <T muted size={12}>moved out</T> : null}
              </View>
              <T strong color={net[m.id]! > 0 ? c.good : net[m.id]! < 0 ? c.bad : c.muted}>
                {net[m.id]! > 0 ? `gets back ${formatInr(net[m.id]!)}` : net[m.id]! < 0 ? `owes ${formatInr(-net[m.id]!)}` : 'settled up'}
              </T>
            </Row>
          ))}
      </Sheet>
    </View>
  );
}

function MonthHeading({ label }: { label: string }) {
  const c = useColors();
  return (
    <View style={[styles.month, { borderColor: c.line }]}>
      <T weight="semibold" size={13} color={c.muted}>{label}</T>
    </View>
  );
}

function ExpenseRow({ e }: { e: Expense }) {
  const c = useColors();
  const { me, nameOf } = useFlat();
  const share = myShare(e, me.id);
  const payers = Object.keys(e.paid);
  const who = (id: string) => (id === me.id ? 'You' : nameOf(id));
  const detail =
    e.category === 'Settlement'
      ? `${who(payers[0]!)} paid ${Object.keys(e.owed).map(who).join(', ')}`
      : `${payers.map(who).join(', ')} paid ${formatInr(e.amount)}`;

  return (
    <Row>
      <DateBlock date={e.date} />
      <CategoryTile category={e.category} />
      <View style={styles.flex}>
        <T weight="medium" numberOfLines={1}>{e.title}</T>
        <T muted size={12}>{detail}</T>
      </View>
      <View style={styles.right}>
        {share.kind === 'none' ? (
          <T muted size={12}>not involved</T>
        ) : (
          <>
            <T size={11} color={share.kind === 'lent' ? c.good : c.bad}>{share.kind === 'lent' ? 'you lent' : 'you borrowed'}</T>
            <T strong color={share.kind === 'lent' ? c.good : c.bad}>{formatInr(share.amount)}</T>
          </>
        )}
      </View>
    </Row>
  );
}

/** Record a cash/UPI payment that clears what you owe (or what someone owes you). */
function SettleUp({ onDone }: { onDone: () => void }) {
  const c = useColors();
  const { state, me, nameOf, dispatch, today } = useFlat();
  const net = netBalances(state.expenses, state.members.map(m => m.id));
  const mine = myDebts(settleUp(net), me.id);
  const [busy, setBusy] = useState('');

  if (mine.length === 0) return <Empty>You are all settled up. Nothing to pay.</Empty>;

  const record = async (other: string, amount: number, owesMe: boolean) => {
    setBusy(other);
    const [from, to] = owesMe ? [other, me.id] : [me.id, other];
    const ok = await dispatch({
      type: 'addExpense',
      title: 'Payment',
      category: 'Settlement',
      amount,
      paidBy: from,
      splitAmong: [to],
      date: today,
    });
    setBusy('');
    if (ok) onDone();
  };

  return (
    <>
      {mine.map(d => (
        <Card key={d.other}>
          <View style={styles.settleRow}>
            <Avatar id={d.owesMe ? d.other : me.id} name={d.owesMe ? nameOf(d.other) : me.name} />
            <T muted>→</T>
            <Avatar id={d.owesMe ? me.id : d.other} name={d.owesMe ? me.name : nameOf(d.other)} />
            <View style={styles.flex}>
              <T>{d.owesMe ? `${nameOf(d.other)} pays you` : `You pay ${nameOf(d.other)}`}</T>
              <T strong color={d.owesMe ? c.good : c.bad}>{formatInr(d.amount)}</T>
            </View>
          </View>
          <Button
            title={busy === d.other ? 'Saving…' : 'Record this payment'}
            disabled={!!busy}
            onPress={() => record(d.other, d.amount, d.owesMe)}
          />
        </Card>
      ))}
    </>
  );
}

function AddExpense({ onDone }: { onDone: () => void }) {
  const { dispatch, me, active, today } = useFlat();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState<ExpenseCategory>('Groceries');
  const [paidBy, setPaidBy] = useState(me.id);
  const [split, setSplit] = useState(active.map(m => m.id));
  const [error, setError] = useState('');
  const paise = parseRupees(amount);
  const each = paise && split.length ? Math.round(paise / split.length) : 0;

  const save = async () => {
    if (!title.trim()) return setError('Add a title.');
    if (!paise) return setError('Enter an amount like 2400 or 2400.50.');
    if (!isIsoDate(date)) return setError('Date must be YYYY-MM-DD.');
    if (split.length === 0) return setError('Pick at least one person to split with.');
    if (await dispatch({ type: 'addExpense', title: title.trim(), category, amount: paise, paidBy, splitAmong: split, date })) onDone();
  };

  return (
    <>
      <ErrorText>{error}</ErrorText>
      <Field label="Title" value={title} onChangeText={setTitle} placeholder="Weekly groceries" />
      <Field label="Amount (₹)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="2400" />
      <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" autoCapitalize="none" />
      <Label>Category</Label>
      <Chips>
        {EXPENSE_CATEGORIES.filter(x => x !== 'Settlement').map(x => (
          <Chip key={x} label={x} selected={x === category} onPress={() => setCategory(x)} />
        ))}
      </Chips>
      <Label>Paid by</Label>
      <MemberPicker members={active} selected={[paidBy]} onToggle={setPaidBy} />
      <Label>Split equally between</Label>
      <MemberPicker
        members={active}
        selected={split}
        onToggle={id => setSplit(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]))}
      />
      {each ? <T muted size={13}>{`${formatInr(each)} each`}</T> : null}
      <Button title="Save expense" onPress={save} />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { fontFamily: font.extrabold, fontSize: ms(32), letterSpacing: -0.5 },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  month: { paddingTop: space.md, paddingBottom: space.xs, borderTopWidth: StyleSheet.hairlineWidth },
  right: { alignItems: 'flex-end' },
  settleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});

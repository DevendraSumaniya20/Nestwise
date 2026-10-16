import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { netBalances, settleUp } from '../services/balances';
import { isIsoDate, shortDate } from '../utils/dates';
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '../types';
import { formatInr, parseRupees } from '../utils/money';
import { AddCard, Button, Card, Chip, Chips, Empty, ErrorText, Field, Label, MemberPicker, Row, Screen, T } from '../components';
import { useColors, useFlat } from '../hooks';
import { useT } from '../i18n';

export function MoneyScreen() {
  const t = useT();
  const { state, nameOf, active } = useFlat();
  const c = useColors();
  const net = netBalances(state.expenses, state.members.map(m => m.id));
  const transfers = settleUp(net);

  return (
    <Screen title={t.money.title} subtitle={t.money.subtitle}>
      <AddCard title={t.money.add}>{close => <AddExpense onDone={close} />}</AddCard>

      <Card title={t.money.balances}>
        {state.members
          .filter(m => active.includes(m) || net[m.id] !== 0)
          .map(m => (
            <Row key={m.id}>
              <View style={styles.flex}>
                <T>{m.name}{m.moveOut ? ' (moved out)' : ''}</T>
              </View>
              <T strong color={net[m.id] > 0 ? c.good : net[m.id] < 0 ? c.bad : c.muted}>
                {net[m.id] > 0 ? `gets ${formatInr(net[m.id])}` : net[m.id] < 0 ? `owes ${formatInr(-net[m.id])}` : 'settled'}
              </T>
            </Row>
          ))}
      </Card>

      <Card title={t.money.settleUp}>
        {transfers.length === 0 ? (
          <Empty>{t.money.square}</Empty>
        ) : (
          transfers.map(t => (
            <Row key={`${t.from}-${t.to}`}>
              <View style={styles.flex}>
                <T>{nameOf(t.from)} → {nameOf(t.to)}</T>
              </View>
              <T strong>{formatInr(t.amount)}</T>
            </Row>
          ))
        )}
      </Card>

      <Card title={t.money.expenses}>
        {state.expenses.length === 0 ? (
          <Empty>{t.money.none}</Empty>
        ) : (
          state.expenses.map(e => (
            <Row key={e.id}>
              <View style={styles.flex}>
                <T>{e.title}</T>
                <T muted size={13}>
                  {e.category} · {shortDate(e.date)} · paid by {Object.keys(e.paid).map(nameOf).join(', ')}
                </T>
              </View>
              <T strong>{formatInr(e.amount)}</T>
            </Row>
          ))
        )}
      </Card>
    </Screen>
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

  const save = () => {
    const paise = parseRupees(amount);
    if (!title.trim()) return setError('Add a title.');
    if (!paise) return setError('Enter an amount like 2400 or 2400.50.');
    if (!isIsoDate(date)) return setError('Date must be YYYY-MM-DD.');
    if (split.length === 0) return setError('Pick at least one person to split with.');
    dispatch({ type: 'addExpense', title: title.trim(), category, amount: paise, paidBy, splitAmong: split, date });
    onDone();
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
      <Button title="Save expense" onPress={save} />
    </>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });

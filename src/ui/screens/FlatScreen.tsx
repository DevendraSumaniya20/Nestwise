import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFlat } from '../../app/FlatProvider';
import { addDays, isIsoDate, relativeDay, shortDate } from '../../domain/dates';
import { EXPENSE_CATEGORIES, type Bill, type ExpenseCategory, type Member } from '../../domain/model';
import { formatInr, parseRupees } from '../../domain/money';
import { moveOutSettlement, outstandingAfterMoveOut } from '../../domain/settlement';
import { AddCard, Button, Card, Chip, Chips, Empty, ErrorText, Field, Label, MemberPicker, Row, Screen, T } from '../components';
import { space, useColors } from '../theme';

export function FlatScreen() {
  const { state } = useFlat();
  const [paying, setPaying] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<string | null>(null);
  const pending = state.bills.filter(b => b.status === 'pending').sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const paid = state.bills.filter(b => b.status === 'paid');

  return (
    <Screen title="Flat" subtitle="Bills, people, move-outs">
      <Card title="Pending bills">
        {pending.length === 0 ? <Empty>No pending bills.</Empty> : null}
        {pending.map(b => (
          <BillRow key={b.id} bill={b} open={paying === b.id} onToggle={() => setPaying(paying === b.id ? null : b.id)} />
        ))}
      </Card>
      <AddCard title="Add bill">{close => <AddBill onDone={close} />}</AddCard>
      {paid.length ? (
        <Card title="Paid bills">
          {paid.map(b => (
            <Row key={b.id}>
              <View style={styles.flex}>
                <T>{b.name}</T>
                <T muted size={13}>{shortDate(b.periodStart)} – {shortDate(b.periodEnd)}</T>
              </View>
              <T strong>{formatInr(b.amount)}</T>
            </Row>
          ))}
        </Card>
      ) : null}

      <Card title="Flatmates">
        {state.members.map(m => (
          <MemberRow key={m.id} member={m} open={leaving === m.id} onToggle={() => setLeaving(leaving === m.id ? null : m.id)} />
        ))}
      </Card>
      <AddCard title="Add flatmate">{close => <AddMember onDone={close} />}</AddCard>
    </Screen>
  );
}

function BillRow({ bill, open, onToggle }: { bill: Bill; open: boolean; onToggle: () => void }) {
  const { dispatch, today, active, me } = useFlat();
  const c = useColors();
  const [payer, setPayer] = useState(me.id);
  const [amount, setAmount] = useState(String(bill.amount / 100));
  const [error, setError] = useState('');
  const overdue = bill.dueDate < today;

  const pay = () => {
    const p = parseRupees(amount);
    if (!p) return setError('Enter the actual bill amount.');
    dispatch({ type: 'payBill', billId: bill.id, payerId: payer, amount: p, date: today });
  };

  return (
    <View>
      <Row onPress={onToggle} label={`Pay ${bill.name}`}>
        <View style={styles.flex}>
          <T strong>{bill.name}</T>
          <T muted size={13} color={overdue ? c.bad : undefined}>
            Due {relativeDay(bill.dueDate, today)} · for {shortDate(bill.periodStart)} – {shortDate(bill.periodEnd)}
          </T>
        </View>
        <T strong>{formatInr(bill.amount)}</T>
      </Row>
      {open ? (
        <View style={styles.inset}>
          <ErrorText>{error}</ErrorText>
          <Field label="Actual amount (₹)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          <Label>Paid by</Label>
          <MemberPicker members={active} selected={[payer]} onToggle={setPayer} />
          <T muted size={13}>Split by days each person lived here during the bill period.</T>
          <Button title="Mark paid" onPress={pay} />
        </View>
      ) : null}
    </View>
  );
}

function MemberRow({ member, open, onToggle }: { member: Member; open: boolean; onToggle: () => void }) {
  const { state, dispatch, today, active } = useFlat();
  const c = useColors();
  const [date, setDate] = useState(today);
  const valid = isIsoDate(date) && date >= member.moveIn;
  const preview = valid ? moveOutSettlement(member.id, date, state.members, state.expenses, state.bills) : null;

  if (member.moveOut) {
    const left = outstandingAfterMoveOut(member.id, state.members, state.expenses, state.bills);
    return (
      <Row>
        <View style={styles.flex}>
          <T muted>{member.name}</T>
          <T muted size={13}>Moved out {shortDate(member.moveOut)}</T>
        </View>
        <T strong color={left === 0 ? c.muted : left > 0 ? c.good : c.bad}>
          {left === 0 ? 'settled' : left > 0 ? `flat owes ${formatInr(left)}` : `owes ${formatInr(-left)}`}
        </T>
      </Row>
    );
  }

  return (
    <View>
      <Row onPress={onToggle} label={`Move-out options for ${member.name}`}>
        <View style={styles.flex}>
          <T>{member.name}</T>
          <T muted size={13}>Since {shortDate(member.moveIn)}</T>
        </View>
        <T muted size={13}>{open ? 'Close' : 'Move out'}</T>
      </Row>
      {open ? (
        <View style={styles.inset}>
          <Field label="Move-out date" value={date} onChangeText={setDate} autoCapitalize="none" />
          {preview ? (
            <View style={[styles.statement, { borderColor: c.line, backgroundColor: c.bg }]}>
              <Line label="Expense balance" value={preview.balance} />
              {preview.estimates.map(e => (
                <Line key={e.bill.id} label={`${e.bill.name} estimate (pending)`} value={-e.share} />
              ))}
              <View style={[styles.rule, { backgroundColor: c.line }]} />
              <T strong size={17} color={preview.final >= 0 ? c.good : c.bad}>
                {preview.final >= 0
                  ? `${member.name} receives ${formatInr(preview.final)}`
                  : `${member.name} pays ${formatInr(-preview.final)}`}
              </T>
              <T muted size={12}>
                Estimates are pro-rated by days lived. When the real bill is paid, the difference shows up here as an adjustment.
              </T>
            </View>
          ) : (
            <ErrorText>Enter a date (YYYY-MM-DD) on or after move-in.</ErrorText>
          )}
          <Button
            title="Confirm move-out & book settlement"
            disabled={!preview || active.length < 2}
            onPress={() => dispatch({ type: 'moveOut', memberId: member.id, date })}
          />
        </View>
      ) : null}
    </View>
  );
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.line}>
      <View style={styles.flex}>
        <T muted size={14}>{label}</T>
      </View>
      <T size={14}>{value >= 0 ? `+${formatInr(value)}` : formatInr(value)}</T>
    </View>
  );
}

function AddBill({ onDone }: { onDone: () => void }) {
  const { dispatch, today } = useFlat();
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Electricity');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(addDays(today, 7));
  const [periodStart, setPeriodStart] = useState(today.slice(0, 8) + '01');
  const [periodEnd, setPeriodEnd] = useState(today);
  const [error, setError] = useState('');

  const save = () => {
    const p = parseRupees(amount);
    if (!name.trim()) return setError('Add a bill name.');
    if (!p) return setError('Enter the amount or your best estimate.');
    if (![dueDate, periodStart, periodEnd].every(isIsoDate)) return setError('Dates must be YYYY-MM-DD.');
    if (periodStart > periodEnd) return setError('Period start must be before period end.');
    dispatch({ type: 'addBill', bill: { name: name.trim(), category, amount: p, dueDate, periodStart, periodEnd } });
    onDone();
  };

  return (
    <>
      <ErrorText>{error}</ErrorText>
      <Field label="Bill" value={name} onChangeText={setName} placeholder="Electricity" />
      <Label>Category</Label>
      <Chips>
        {EXPENSE_CATEGORIES.filter(x => x !== 'Settlement').map(x => (
          <Chip key={x} label={x} selected={x === category} onPress={() => setCategory(x)} />
        ))}
      </Chips>
      <Field label="Amount or estimate (₹)" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
      <Field label="Due date" value={dueDate} onChangeText={setDueDate} autoCapitalize="none" />
      <View style={styles.pair}>
        <View style={styles.flex}>
          <Field label="Period from" value={periodStart} onChangeText={setPeriodStart} autoCapitalize="none" />
        </View>
        <View style={styles.flex}>
          <Field label="Period to" value={periodEnd} onChangeText={setPeriodEnd} autoCapitalize="none" />
        </View>
      </View>
      <Button title="Add bill" onPress={save} />
    </>
  );
}

function AddMember({ onDone }: { onDone: () => void }) {
  const { dispatch, today } = useFlat();
  const [name, setName] = useState('');
  const [moveIn, setMoveIn] = useState(today);
  const [error, setError] = useState('');
  const save = () => {
    if (!name.trim()) return setError('Add a name.');
    if (!isIsoDate(moveIn)) return setError('Date must be YYYY-MM-DD.');
    dispatch({ type: 'addMember', name: name.trim(), moveIn });
    onDone();
  };
  return (
    <>
      <ErrorText>{error}</ErrorText>
      <Field label="Name" value={name} onChangeText={setName} placeholder="Priya" />
      <Field label="Move-in date" value={moveIn} onChangeText={setMoveIn} autoCapitalize="none" />
      <Button title="Add flatmate" onPress={save} />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  inset: { paddingBottom: space.md, gap: space.sm },
  pair: { flexDirection: 'row', gap: space.md },
  statement: { borderWidth: 1, borderRadius: 12, padding: space.md, gap: space.xs, marginBottom: space.sm },
  line: { flexDirection: 'row', alignItems: 'center' },
  rule: { height: 1, marginVertical: space.xs },
});

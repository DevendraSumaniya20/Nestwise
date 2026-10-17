import { ChevronLeft, ChevronRight, HandCoins, Plus, Scale } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
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
  Icon,
  Label,
  ListScreen,
  MemberPicker,
  Row,
  Sheet,
  T,
  Touchable,
} from '../components';
import { categoryHue, font, ms, radius, space } from '../constants';
import { flatApi } from '../services/api';
import { useColors, useFlat } from '../hooks';
import { useT } from '../i18n';
import { myDebts, myShare, netBalances, settleUp } from '../services/balances';
import { EXPENSE_CATEGORIES, type Expense, type ExpenseCategory, type ExpenseComment, type Spending } from '../types';
import { isIsoDate } from '../utils/dates';
import { formatInr, parseRupees, splitByWeights } from '../utils/money';

type Item = { kind: 'month'; key: string; label: string } | { kind: 'expense'; key: string; e: Expense };

const MONTHS = 'January February March April May June July August September October November December'.split(' ');
const monthLabel = (iso: string) => `${MONTHS[Number(iso.slice(5, 7)) - 1]} ${iso.slice(0, 4)}`;
/** "2026-01" shifted by n months. */
function shiftMonth(month: string, n: number): string {
  const d = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

export function MoneyScreen() {
  const t = useT();
  const c = useColors();
  const { state, me, nameOf, refresh } = useFlat();
  const [sheet, setSheet] = useState<null | 'add' | 'settle' | 'balances'>(null);
  const close = () => setSheet(null);
  const [openId, setOpenId] = useState<string | null>(null);
  // Looked up live so the sheet closes by itself if the expense is deleted.
  const open = state.expenses.find(e => e.id === openId);

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
    <>
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
      <SpendingCard />
    </>
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
        renderItem={i => (i.kind === 'month' ? <MonthHeading label={i.label} /> : <ExpenseRow e={i.e} onOpen={() => setOpenId(i.e.id)} />)}
      />
      <Fab label={t.money.add} icon={Plus} onPress={() => setSheet('add')} />

      <Sheet visible={sheet === 'add'} title={t.money.add} onClose={close}>
        <AddExpense onDone={close} />
      </Sheet>
      <Sheet visible={!!open} title={open?.title ?? ''} onClose={() => setOpenId(null)}>
        {open ? <ExpenseDetail e={open} /> : null}
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

/** This month's flat spending by category and person, computed by the server. */
function SpendingCard() {
  const t = useT();
  const c = useColors();
  const { flatId, state, today, nameOf } = useFlat();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [data, setData] = useState<Spending | null>(null);
  const [error, setError] = useState('');

  // Refetch when the month changes or any expense is added/removed.
  useEffect(() => {
    let live = true;
    flatApi
      .spending(flatId, month)
      .then(d => live && (setData(d), setError('')))
      .catch(e => live && setError(e instanceof Error ? e.message : 'Could not load spending.'));
    return () => {
      live = false;
    };
  }, [flatId, month, state.expenses]);

  const max = data?.byCategory[0]?.amount ?? 0;
  const nav = (n: number, Svg: typeof ChevronLeft, label: string) => (
    <Touchable onPress={() => setMonth(m => shiftMonth(m, n))} accessibilityRole="button" accessibilityLabel={label} hitSlop={8} pressScale={1}>
      <Icon as={Svg} size="sm" color={c.muted} />
    </Touchable>
  );

  return (
    <Card
      title={t.money.spending}
      action={
        <View style={styles.monthNav}>
          {nav(-1, ChevronLeft, 'Previous month')}
          <T size={13} weight="semibold">{monthLabel(`${month}-01`)}</T>
          {month < today.slice(0, 7) ? nav(1, ChevronRight, 'Next month') : <View style={styles.navSpacer} />}
        </View>
      }
    >
      {error ? <ErrorText>{error}</ErrorText> : null}
      {data && data.total === 0 ? <Empty>{t.money.noSpending}</Empty> : null}
      {data && data.total > 0 ? (
        <>
          <T strong size={22}>{formatInr(data.total)}</T>
          {data.byCategory.map(x => (
            <View key={x.category} style={styles.barRow}>
              <View style={styles.barLabel}>
                <T size={13}>{x.category}</T>
                <T size={13} muted>{formatInr(x.amount)}</T>
              </View>
              <View style={[styles.track, { backgroundColor: c.line }]}>
                <View style={[styles.bar, { width: `${(x.amount / max) * 100}%`, backgroundColor: categoryHue[x.category] ?? c.accent }]} />
              </View>
            </View>
          ))}
          <Label>Per person</Label>
          {data.byMember.map(p => (
            <Row key={p.memberId}>
              <Avatar id={p.memberId} name={nameOf(p.memberId)} size={28} />
              <View style={styles.flex}>
                <T size={14}>{nameOf(p.memberId)}</T>
                <T muted size={12}>paid {formatInr(p.paid)}</T>
              </View>
              <T size={14} weight="semibold">share {formatInr(p.share)}</T>
            </Row>
          ))}
        </>
      ) : null}
    </Card>
  );
}

/** Who paid, who owes, and the flatmates' comments on one expense. */
function ExpenseDetail({ e }: { e: Expense }) {
  const t = useT();
  const { flatId, nameOf, me } = useFlat();
  const [comments, setComments] = useState<ExpenseComment[] | null>(null);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const who = (id: string) => (id === me.id ? 'You' : nameOf(id));

  useEffect(() => {
    let live = true;
    flatApi
      .comments(flatId, e.id)
      .then(r => live && setComments(r.comments))
      .catch(err => live && setError(err instanceof Error ? err.message : 'Could not load comments.'));
    return () => {
      live = false;
    };
  }, [flatId, e.id]);

  const post = async () => {
    if (!draft.trim()) return;
    setBusy(true);
    try {
      setComments((await flatApi.addComment(flatId, e.id, draft.trim())).comments);
      setDraft('');
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post.');
    }
    setBusy(false);
  };

  return (
    <>
      <T muted size={13}>{`${e.category} · ${e.date} · ${formatInr(e.amount)}`}</T>
      <Label>Paid</Label>
      {Object.entries(e.paid).map(([id, p]) => (
        <View key={id} style={styles.line}>
          <View style={styles.flex}><T>{who(id)}</T></View>
          <T>{formatInr(p)}</T>
        </View>
      ))}
      <Label>Split</Label>
      {Object.entries(e.owed).map(([id, p]) => (
        <View key={id} style={styles.line}>
          <View style={styles.flex}><T>{who(id)}</T></View>
          <T>{formatInr(p)}</T>
        </View>
      ))}
      <Label>{t.money.comments}</Label>
      {comments?.length === 0 ? <T muted size={13}>{t.money.noComments}</T> : null}
      {comments?.map(cm => (
        <View key={cm.id} style={styles.comment}>
          <Avatar id={cm.memberId} name={nameOf(cm.memberId)} size={26} />
          <View style={styles.flex}>
            <T size={13} weight="semibold">{who(cm.memberId)}</T>
            <T size={14}>{cm.body}</T>
          </View>
        </View>
      ))}
      <ErrorText>{error}</ErrorText>
      <Field label="Add a comment" value={draft} onChangeText={setDraft} maxLength={500} placeholder="Includes the deposit" />
      <Button title={busy ? 'Posting…' : 'Post comment'} disabled={busy || !draft.trim()} onPress={post} />
    </>
  );
}

function ExpenseRow({ e, onOpen }: { e: Expense; onOpen: () => void }) {
  const c = useColors();
  const { me, nameOf, dispatch } = useFlat();
  const share = myShare(e, me.id);
  const payers = Object.keys(e.paid);
  const who = (id: string) => (id === me.id ? 'You' : nameOf(id));
  const detail =
    e.category === 'Settlement'
      ? `${who(payers[0]!)} paid ${Object.keys(e.owed).map(who).join(', ')}`
      : `${payers.map(who).join(', ')} paid ${formatInr(e.amount)}`;

  // Bill payments belong to their bill; only plain expenses and payments can be removed.
  const remove = e.billId
    ? undefined
    : () =>
        Alert.alert('Delete expense?', `${e.title} · ${formatInr(e.amount)}`, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => dispatch({ type: 'deleteExpense', id: e.id }) },
        ]);

  return (
    <Row label={e.title} onPress={onOpen} onLongPress={remove}>
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
  const c = useColors();
  const { dispatch, me, active, today } = useFlat();
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(today);
  const [category, setCategory] = useState<ExpenseCategory>('Groceries');
  const [paidBy, setPaidBy] = useState(me.id);
  const [split, setSplit] = useState(active.map(m => m.id));
  const [byShares, setByShares] = useState(false);
  const [multiPay, setMultiPay] = useState(false);
  const [paidAmounts, setPaidAmounts] = useState<Record<string, string>>({});
  const [shares, setShares] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const paise = parseRupees(amount);
  const each = paise && split.length ? Math.round(paise / split.length) : 0;
  // Unequal split, e.g. 2 shares for the big room. Blank counts as 1.
  const weights = Object.fromEntries(split.map(id => [id, Number(shares[id] || 1)]));
  const sharesValid = Object.values(weights).every(w => Number.isInteger(w) && w >= 1 && w <= 100);
  const owed = byShares && paise && sharesValid ? splitByWeights(paise, weights) : null;
  // Several payers: blank = paid nothing.
  const payers = Object.fromEntries(
    active.map(m => [m.id, paidAmounts[m.id]?.trim() ? parseRupees(paidAmounts[m.id]!) : 0] as const).filter(([, p]) => p !== 0),
  );
  const payersValid = Object.values(payers).every(p => p !== null) && Object.keys(payers).length > 0;
  const paidSum = Object.values(payers).reduce<number>((s, p) => s + (p ?? 0), 0);

  const save = async () => {
    if (!title.trim()) return setError('Add a title.');
    if (!paise) return setError('Enter an amount like 2400 or 2400.50.');
    if (!isIsoDate(date)) return setError('Date must be YYYY-MM-DD.');
    if (split.length === 0) return setError('Pick at least one person to split with.');
    if (byShares && !sharesValid) return setError('Shares must be whole numbers from 1 to 100.');
    if (multiPay && !payersValid) return setError('Enter what each person paid, like 1200 or 1200.50.');
    if (multiPay && paidSum !== paise) return setError(`Payments add up to ${formatInr(paidSum)}, not ${formatInr(paise)}.`);
    const action = {
      type: 'addExpense' as const,
      title: title.trim(),
      category,
      amount: paise,
      paidBy: multiPay ? Object.keys(payers)[0]! : paidBy,
      splitAmong: split,
      date,
      ...(byShares && { weights }),
      ...(multiPay && { payers: payers as Record<string, number> }),
    };
    if (await dispatch(action)) onDone();
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
      <Chips>
        <Chip label="One person" selected={!multiPay} onPress={() => setMultiPay(false)} />
        <Chip label="Several people" selected={multiPay} onPress={() => setMultiPay(true)} />
      </Chips>
      {multiPay ? (
        <>
          {active.map(m => (
            <Field
              key={m.id}
              label={`${m.name} paid (₹)`}
              value={paidAmounts[m.id] ?? ''}
              onChangeText={v => setPaidAmounts(s => ({ ...s, [m.id]: v }))}
              keyboardType="decimal-pad"
              placeholder="0"
            />
          ))}
          {paise ? (
            <T muted size={13} color={paidSum === paise ? undefined : c.bad}>
              {`${formatInr(paidSum)} of ${formatInr(paise)}`}
            </T>
          ) : null}
        </>
      ) : (
        <MemberPicker members={active} selected={[paidBy]} onToggle={setPaidBy} />
      )}
      <Label>Split</Label>
      <Chips>
        <Chip label="Equally" selected={!byShares} onPress={() => setByShares(false)} />
        <Chip label="By shares" selected={byShares} onPress={() => setByShares(true)} />
      </Chips>
      <MemberPicker
        members={active}
        selected={split}
        onToggle={id => setSplit(s => (s.includes(id) ? s.filter(x => x !== id) : [...s, id]))}
      />
      {byShares
        ? active
            .filter(m => split.includes(m.id))
            .map(m => (
              <View key={m.id} style={styles.shareRow}>
                <View style={styles.flex}>
                  <Field
                    label={`${m.name} — shares`}
                    value={shares[m.id] ?? ''}
                    onChangeText={v => setShares(s => ({ ...s, [m.id]: v }))}
                    keyboardType="number-pad"
                    placeholder="1"
                  />
                </View>
                <T muted size={13}>{owed?.[m.id] !== undefined ? formatInr(owed[m.id]!) : '—'}</T>
              </View>
            ))
        : each
          ? <T muted size={13}>{`${formatInr(each)} each`}</T>
          : null}
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
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  navSpacer: { width: ms(16) },
  barRow: { gap: space.xs, marginTop: space.sm },
  barLabel: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: ms(8), borderRadius: radius, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: radius },
  line: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.xs },
  comment: { flexDirection: 'row', gap: space.sm, paddingVertical: space.xs },
});

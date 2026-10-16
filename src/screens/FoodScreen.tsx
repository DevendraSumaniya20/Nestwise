import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { addDays, isIsoDate, relativeDay, shortDate } from '../utils/dates';
import { RECIPES } from '../data/recipes';
import { AddCard, Button, Card, Checkbox, Chip, Chips, Empty, ErrorText, Field, Label, Row, Screen, T } from '../components';
import { space } from '../constants';
import { useFlat } from '../hooks';
import { useT } from '../i18n';

export function FoodScreen() {
  const t = useT();
  const { state, dispatch, today, active, nameOf } = useFlat();
  const [editing, setEditing] = useState<string | null>(null);
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i));
  const weekEnd = days[6];
  const unlisted = state.meals.filter(m => !m.listed && m.date >= today && m.date <= weekEnd).length;
  const groceries = [...state.groceries].sort(
    (a, b) => Number(a.bought) - Number(b.bought) || a.neededBy.localeCompare(b.neededBy),
  );

  // Tap the assignee to cycle: nobody → each flatmate → nobody.
  const nextAssignee = (current?: string) => {
    const i = active.findIndex(m => m.id === current);
    return i + 1 < active.length ? active[i + 1].id : undefined;
  };

  return (
    <Screen title={t.food.title} subtitle={t.food.subtitle}>
      <Card title={t.food.week}>
        {days.map(d => {
          const meal = state.meals.find(m => m.date === d);
          return (
            <View key={d}>
              <Row onPress={() => setEditing(editing === d ? null : d)} label={`Change dinner for ${shortDate(d)}`}>
                <View style={styles.day}>
                  <T muted size={13}>{d === today ? 'Today' : shortDate(d)}</T>
                </View>
                <View style={styles.flex}>
                  <T strong={!!meal} muted={!meal}>{meal?.name ?? 'Tap to plan'}</T>
                </View>
                {meal?.listed ? <T muted size={12}>on list</T> : null}
              </Row>
              {editing === d ? (
                <Chips>
                  {RECIPES.map(r => (
                    <Chip
                      key={r.name}
                      label={r.name}
                      selected={meal?.name === r.name}
                      onPress={() => {
                        dispatch({ type: 'setMeal', date: d, recipe: r });
                        setEditing(null);
                      }}
                    />
                  ))}
                  {meal ? (
                    <Chip label="Clear" onPress={() => { dispatch({ type: 'setMeal', date: d, recipe: null }); setEditing(null); }} />
                  ) : null}
                </Chips>
              ) : null}
            </View>
          );
        })}
        <Button
          title={unlisted ? `Add ingredients for ${unlisted} meal${unlisted > 1 ? 's' : ''} to list` : 'All meals are on the list'}
          disabled={!unlisted}
          onPress={() => dispatch({ type: 'generateGroceries', from: today, to: weekEnd })}
        />
      </Card>

      <Card title={t.food.list}>
        {groceries.length === 0 ? (
          <Empty>{t.food.listEmpty}</Empty>
        ) : (
          <>
            <Label>Give every unassigned item to</Label>
            <Chips>
              {active.map(m => (
                <Chip key={m.id} label={m.name} onPress={() => dispatch({ type: 'assignAllOpen', assignee: m.id })} />
              ))}
            </Chips>
            {groceries.map(g => (
              <Row key={g.id}>
                <Checkbox checked={g.bought} label={`${g.name} bought`} onPress={() => dispatch({ type: 'toggleBought', id: g.id })} />
                <View style={styles.flex}>
                  <T muted={g.bought}>{g.name} · {g.qty} {g.unit}</T>
                  <T muted size={12}>
                    {g.bought ? 'Bought' : `Needed ${relativeDay(g.neededBy, today)}`}
                    {g.forMeals.length ? ` · ${g.forMeals.join(', ')}` : ''}
                  </T>
                </View>
                <Chip
                  label={nameOf(g.assignee)}
                  selected={!!g.assignee}
                  onPress={() => dispatch({ type: 'assignGrocery', id: g.id, assignee: nextAssignee(g.assignee) })}
                />
              </Row>
            ))}
          </>
        )}
      </Card>

      <AddCard title={t.food.add}>{close => <AddGrocery onDone={close} />}</AddCard>
    </Screen>
  );
}

function AddGrocery({ onDone }: { onDone: () => void }) {
  const { dispatch, today } = useFlat();
  const [name, setName] = useState('');
  const [qty, setQty] = useState('1');
  const [unit, setUnit] = useState('kg');
  const [neededBy, setNeededBy] = useState(addDays(today, 1));
  const [error, setError] = useState('');

  const save = () => {
    const n = Number(qty);
    if (!name.trim()) return setError('Add an item name.');
    if (!(n > 0)) return setError('Quantity must be a number above 0.');
    if (!isIsoDate(neededBy)) return setError('Date must be YYYY-MM-DD.');
    dispatch({ type: 'addGrocery', name: name.trim(), qty: n, unit: unit.trim() || 'pc', neededBy });
    onDone();
  };

  return (
    <>
      <ErrorText>{error}</ErrorText>
      <Field label="Item" value={name} onChangeText={setName} placeholder="Milk" />
      <View style={styles.pair}>
        <View style={styles.flex}>
          <Field label="Qty" value={qty} onChangeText={setQty} keyboardType="decimal-pad" />
        </View>
        <View style={styles.flex}>
          <Field label="Unit" value={unit} onChangeText={setUnit} autoCapitalize="none" />
        </View>
      </View>
      <Field label="Needed by" value={neededBy} onChangeText={setNeededBy} autoCapitalize="none" />
      <Button title="Add to list" onPress={save} />
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  day: { width: 92 },
  pair: { flexDirection: 'row', gap: space.md },
});

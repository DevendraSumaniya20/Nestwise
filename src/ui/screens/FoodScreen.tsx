import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useFlat } from '../../app/FlatProvider';
import { addDays, isIsoDate, relativeDay, shortDate } from '../../domain/dates';
import { RECIPES } from '../../domain/recipes';
import { AddCard, Button, Card, Chip, Chips, Empty, ErrorText, Field, Label, Row, Screen, T } from '../components';
import { space, useColors } from '../theme';

export function FoodScreen() {
  const { state, dispatch, today, active, nameOf } = useFlat();
  const c = useColors();
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
    <Screen title="Meals & groceries" subtitle="Plan dinners, the list writes itself">
      <Card title="This week's dinners">
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

      <Card title="Grocery list">
        {groceries.length === 0 ? (
          <Empty>Empty. Plan dinners above, then add their ingredients.</Empty>
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
                <Pressable
                  onPress={() => dispatch({ type: 'toggleBought', id: g.id })}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: g.bought }}
                  accessibilityLabel={`${g.name} bought`}
                  hitSlop={8}
                  style={[styles.check, { borderColor: g.bought ? c.good : c.line, backgroundColor: g.bought ? c.good : 'transparent' }]}
                >
                  {g.bought ? <T color={c.card} strong>✓</T> : null}
                </Pressable>
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

      <AddCard title="Add grocery item">{close => <AddGrocery onDone={close} />}</AddCard>
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
  check: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});

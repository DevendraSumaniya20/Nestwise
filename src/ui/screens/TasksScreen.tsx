import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFlat } from '../../app/FlatProvider';
import { addDays, isIsoDate, relativeDay } from '../../domain/dates';
import type { TaskStatus } from '../../domain/model';
import { AddCard, Button, Card, Chip, Empty, ErrorText, Field, Label, MemberPicker, Screen, T, Row } from '../components';
import { useColors } from '../theme';

const STATUS: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  done: 'Done',
};

export function TasksScreen() {
  const { state, dispatch, today, nameOf } = useFlat();
  const c = useColors();
  const tasks = [...state.tasks].sort(
    (a, b) => Number(a.status === 'done') - Number(b.status === 'done') || a.due.localeCompare(b.due),
  );
  return (
    <Screen title="Tasks" subtitle="Who does what, by when">
      <AddCard title="Add task">{close => <AddTask onDone={close} />}</AddCard>
      <Card title="All tasks">
        {tasks.length === 0 ? (
          <Empty>No tasks yet.</Empty>
        ) : (
          tasks.map(t => {
            const overdue = t.status !== 'done' && t.due < today;
            return (
              <Row key={t.id}>
                <View style={styles.flex}>
                  <T muted={t.status === 'done'}>{t.title}</T>
                  <T muted size={13} color={overdue ? c.bad : undefined}>
                    {nameOf(t.assignee)} · due {relativeDay(t.due, today)}
                  </T>
                </View>
                <Chip
                  label={STATUS[t.status]}
                  selected={t.status === 'done'}
                  onPress={() => dispatch({ type: 'cycleTask', id: t.id })}
                />
              </Row>
            );
          })
        )}
      </Card>
    </Screen>
  );
}

function AddTask({ onDone }: { onDone: () => void }) {
  const { dispatch, active, me, today } = useFlat();
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState(me.id);
  const [due, setDue] = useState(addDays(today, 1));
  const [error, setError] = useState('');

  const save = () => {
    if (!title.trim()) return setError('Add a task title.');
    if (!isIsoDate(due)) return setError('Date must be YYYY-MM-DD.');
    dispatch({ type: 'addTask', title: title.trim(), assignee, due });
    onDone();
  };

  return (
    <>
      <ErrorText>{error}</ErrorText>
      <Field label="Task" value={title} onChangeText={setTitle} placeholder="Clean kitchen" />
      <Field label="Due" value={due} onChangeText={setDue} autoCapitalize="none" />
      <Label>Assign to</Label>
      <MemberPicker members={active} selected={[assignee]} onToggle={setAssignee} />
      <Button title="Add task" onPress={save} />
    </>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });

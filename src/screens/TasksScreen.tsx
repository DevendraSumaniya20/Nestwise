import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { addDays, isIsoDate, relativeDay } from '../utils/dates';
import type { TaskStatus } from '../types';
import { AddCard, Button, Card, Chip, Empty, ErrorText, Field, Label, MemberPicker, Screen, T, Row } from '../components';
import { useColors, useFlat } from '../hooks';
import { useT } from '../i18n';

const STATUS: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  done: 'Done',
};

export function TasksScreen() {
  const t = useT();
  const { state, dispatch, today, nameOf, refresh } = useFlat();
  const c = useColors();
  const tasks = [...state.tasks].sort(
    (a, b) => Number(a.status === 'done') - Number(b.status === 'done') || a.due.localeCompare(b.due),
  );
  return (
    <Screen title={t.tasks.title} subtitle={t.tasks.subtitle} onRefresh={refresh}>
      <AddCard title={t.tasks.add}>{close => <AddTask onDone={close} />}</AddCard>
      <Card title={t.tasks.all}>
        {tasks.length === 0 ? (
          <Empty>{t.tasks.none}</Empty>
        ) : (
          tasks.map(task => {
            const overdue = task.status !== 'done' && task.due < today;
            return (
              <Row key={task.id}>
                <View style={styles.flex}>
                  <T muted={task.status === 'done'}>{task.title}</T>
                  <T muted size={13} color={overdue ? c.bad : undefined}>
                    {nameOf(task.assignee)} · due {relativeDay(task.due, today)}
                  </T>
                </View>
                <Chip
                  label={STATUS[task.status]}
                  selected={task.status === 'done'}
                  onPress={() => dispatch({ type: 'cycleTask', id: task.id })}
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

  const save = async () => {
    if (!title.trim()) return setError('Add a task title.');
    if (!isIsoDate(due)) return setError('Date must be YYYY-MM-DD.');
    if (await dispatch({ type: 'addTask', title: title.trim(), assignee, due })) onDone();
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

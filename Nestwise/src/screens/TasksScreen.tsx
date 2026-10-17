import { Plus } from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { addDays, isIsoDate, relativeDay } from '../utils/dates';
import type { TaskStatus } from '../types';
import {
  Avatar,
  Button,
  Chip,
  Chips,
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
import { ms } from '../constants';
import { useColors, useFlat } from '../hooks';
import { useT } from '../i18n';

const STATUS: Record<TaskStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  done: 'Done',
};

/** Recurring chores: done → the next round goes to the next flatmate on the rota. */
const REPEAT: { label: string; days?: number }[] = [
  { label: 'Once' },
  { label: 'Daily', days: 1 },
  { label: 'Weekly', days: 7 },
  { label: 'Every 2 weeks', days: 14 },
  { label: 'Monthly', days: 30 },
];
const repeatLabel = (days: number) =>
  REPEAT.find(r => r.days === days)?.label.toLowerCase() ?? `every ${days} days`;

export function TasksScreen() {
  const t = useT();
  const { state, dispatch, today, nameOf, refresh } = useFlat();
  const c = useColors();
  const [adding, setAdding] = useState(false);
  const tasks = [...state.tasks].sort(
    (a, b) =>
      Number(a.status === 'done') - Number(b.status === 'done') ||
      a.due.localeCompare(b.due),
  );
  return (
    <View style={styles.flex}>
      <ListScreen
        title={t.tasks.title}
        subtitle={t.tasks.subtitle}
        onRefresh={refresh}
        bottomInset={ms(72)}
        listTitle={t.tasks.all}
        emptyText={t.tasks.none}
        data={tasks}
        keyExtractor={task => task.id}
        renderItem={task => {
          const overdue = task.status !== 'done' && task.due < today;
          return (
            <Row
              label={task.title}
              onLongPress={() =>
                Alert.alert('Delete task?', task.title, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive', onPress: () => dispatch({ type: 'deleteTask', id: task.id }) },
                ])
              }
            >
              <Avatar
                id={task.assignee}
                name={nameOf(task.assignee)}
                size={34}
                faded={task.status === 'done'}
              />
              <View style={styles.flex}>
                <T muted={task.status === 'done'}>{task.title}</T>
                <T muted size={13} color={overdue ? c.bad : undefined}>
                  {nameOf(task.assignee)} · due {relativeDay(task.due, today)}
                  {task.repeatDays ? ` · repeats ${repeatLabel(task.repeatDays)}` : ''}
                </T>
              </View>
              <Chip
                label={STATUS[task.status]}
                selected={task.status === 'done'}
                onPress={() => dispatch({ type: 'cycleTask', id: task.id })}
              />
            </Row>
          );
        }}
      />
      <Fab label={t.tasks.add} icon={Plus} onPress={() => setAdding(true)} />
      <Sheet
        visible={adding}
        title={t.tasks.add}
        onClose={() => setAdding(false)}
      >
        <AddTask onDone={() => setAdding(false)} />
      </Sheet>
    </View>
  );
}

function AddTask({ onDone }: { onDone: () => void }) {
  const { dispatch, active, me, today } = useFlat();
  const [title, setTitle] = useState('');
  const [assignee, setAssignee] = useState(me.id);
  const [due, setDue] = useState(addDays(today, 1));
  const [repeatDays, setRepeatDays] = useState<number | undefined>();
  const [error, setError] = useState('');

  const save = async () => {
    if (!title.trim()) return setError('Add a task title.');
    if (!isIsoDate(due)) return setError('Date must be YYYY-MM-DD.');
    if (await dispatch({ type: 'addTask', title: title.trim(), assignee, due, repeatDays }))
      onDone();
  };

  return (
    <>
      <ErrorText>{error}</ErrorText>
      <Field
        label="Task"
        value={title}
        onChangeText={setTitle}
        placeholder="Clean kitchen"
      />
      <Field
        label="Due"
        value={due}
        onChangeText={setDue}
        autoCapitalize="none"
      />
      <Label>Assign to</Label>
      <MemberPicker
        members={active}
        selected={[assignee]}
        onToggle={setAssignee}
      />
      <Label>Repeat</Label>
      <Chips>
        {REPEAT.map(r => (
          <Chip key={r.label} label={r.label} selected={r.days === repeatDays} onPress={() => setRepeatDays(r.days)} />
        ))}
      </Chips>
      {repeatDays ? <T muted size={13}>When done, the next one goes to the next flatmate.</T> : null}
      <Button title="Save task" onPress={save} />
    </>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });

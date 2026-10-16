import { Plus } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { addDays, isIsoDate, relativeDay } from '../utils/dates';
import type { TaskStatus } from '../types';
import {
  Avatar,
  Button,
  Chip,
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
            <Row>
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
  const [error, setError] = useState('');

  const save = async () => {
    if (!title.trim()) return setError('Add a task title.');
    if (!isIsoDate(due)) return setError('Date must be YYYY-MM-DD.');
    if (await dispatch({ type: 'addTask', title: title.trim(), assignee, due }))
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
      <Button title="Save task" onPress={save} />
    </>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });

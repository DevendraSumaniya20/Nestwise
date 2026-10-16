import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Member } from '../domain/model';
import { radius, space, useColors } from './theme';

export function Screen({
  title,
  subtitle,
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={[styles.screen, { paddingTop: insets.top + space.md }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <View style={styles.flex}>
          {subtitle ? <Text style={[styles.eyebrow, { color: c.muted }]}>{subtitle}</Text> : null}
          <Text style={[styles.title, { color: c.ink }]} accessibilityRole="header">
            {title}
          </Text>
        </View>
        {right}
      </View>
      {children}
    </ScrollView>
  );
}

export function Card({ title, children, action }: { title?: string; children: React.ReactNode; action?: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.card, borderColor: c.line }]}>
      {title || action ? (
        <View style={styles.cardHead}>
          {title ? <Text style={[styles.cardTitle, { color: c.muted }]}>{title.toUpperCase()}</Text> : <View />}
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function T({
  children,
  muted,
  strong,
  size = 15,
  color,
}: {
  children: React.ReactNode;
  muted?: boolean;
  strong?: boolean;
  size?: number;
  color?: string;
}) {
  const c = useColors();
  return (
    <Text
      style={{
        color: color ?? (muted ? c.muted : c.ink),
        fontSize: size,
        fontWeight: strong ? '700' : '400',
      }}
    >
      {children}
    </Text>
  );
}

export function Row({ children, onPress, label }: { children: React.ReactNode; onPress?: () => void; label?: string }) {
  const c = useColors();
  const body = <View style={[styles.row, { borderColor: c.line }]}>{children}</View>;
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => pressed && styles.pressed}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

export function Button({
  title,
  onPress,
  kind = 'primary',
  disabled,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost';
  disabled?: boolean;
}) {
  const c = useColors();
  const primary = kind === 'primary';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: primary ? c.accent : c.soft, opacity: disabled ? 0.45 : 1 },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.buttonText, { color: primary ? c.accentInk : c.ink }]}>{title}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[
        styles.chip,
        { borderColor: selected ? c.accent : c.line, backgroundColor: selected ? c.accent : c.card },
      ]}
    >
      <Text style={{ color: selected ? c.accentInk : c.ink, fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function Chips({ children }: { children: React.ReactNode }) {
  return <View style={styles.chips}>{children}</View>;
}

/** Single- or multi-select of members as chips. */
export function MemberPicker({
  members,
  selected,
  onToggle,
}: {
  members: Member[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <Chips>
      {members.map(m => (
        <Chip key={m.id} label={m.name} selected={selected.includes(m.id)} onPress={() => onToggle(m.id)} />
      ))}
    </Chips>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const c = useColors();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: c.muted }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={c.muted}
        style={[styles.input, { color: c.ink, borderColor: c.line, backgroundColor: c.bg }]}
        {...props}
      />
    </View>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return <Text style={[styles.fieldLabel, { color: c.muted }]}>{children}</Text>;
}

/** Card with a collapsible add form. */
export function AddCard({ title, children }: { title: string; children: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return open ? (
    <Card title={title} action={<Button kind="ghost" title="Cancel" onPress={() => setOpen(false)} />}>
      {children(() => setOpen(false))}
    </Card>
  ) : (
    <View style={styles.addSpacer}>
      <Button kind="ghost" title={`＋ ${title}`} onPress={() => setOpen(true)} />
    </View>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.empty}>
      <T muted>{children}</T>
    </View>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return children ? (
    <Text accessibilityLiveRegion="polite" style={{ color: c.bad, marginBottom: space.sm }}>
      {children}
    </Text>
  ) : null;
}

const styles = StyleSheet.create({
  screen: { padding: space.lg, paddingBottom: 120, gap: space.md },
  header: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: space.sm },
  flex: { flex: 1 },
  eyebrow: { fontSize: 13, fontWeight: '600', letterSpacing: 0.4 },
  title: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5 },
  card: { borderRadius: radius, borderWidth: StyleSheet.hairlineWidth, padding: space.lg, gap: space.sm },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  pressed: { opacity: 0.6 },
  button: { borderRadius: 999, paddingVertical: 11, paddingHorizontal: space.lg, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  buttonText: { fontSize: 15, fontWeight: '700' },
  chip: { borderWidth: 1, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14, minHeight: 38, justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.sm },
  field: { marginBottom: space.sm },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: space.xs },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: space.md, paddingVertical: 10, fontSize: 16, minHeight: 44 },
  addSpacer: { alignItems: 'flex-start' },
  empty: { paddingVertical: space.md },
});

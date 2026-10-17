import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { font, ms, space } from '../constants';
import { useColors } from '../hooks/useColors';
import type { Member } from '../types';
import { Touchable } from './Touchable';

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Touchable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      rippleColor={selected ? c.rippleOnAccent : c.ripple}
      style={[styles.chip, { borderColor: selected ? c.accent : c.line, backgroundColor: selected ? c.accent : c.card }]}
    >
      <Text style={[styles.text, { color: selected ? c.accentInk : c.ink }]}>{label}</Text>
    </Touchable>
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

const styles = StyleSheet.create({
  chip: { borderWidth: 1, borderRadius: 999, paddingVertical: ms(8), paddingHorizontal: ms(14), minHeight: 38, justifyContent: 'center' },
  text: { fontSize: ms(14), fontFamily: font.medium },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.sm },
});

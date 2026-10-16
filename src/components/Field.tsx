import React from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { font, ms, space } from '../constants';
import { useColors } from '../hooks/useColors';

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  const c = useColors();
  return (
    <View style={styles.field}>
      <Label>{label}</Label>
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
  return <Text style={[styles.label, { color: c.muted }]}>{children}</Text>;
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return children ? (
    <Text accessibilityLiveRegion="polite" style={[styles.error, { color: c.bad }]}>
      {children}
    </Text>
  ) : null;
}

const styles = StyleSheet.create({
  field: { marginBottom: space.sm },
  label: { fontSize: ms(13), fontFamily: font.semibold, marginBottom: space.xs },
  input: {
    borderWidth: 1,
    borderRadius: ms(10),
    paddingHorizontal: space.md,
    paddingVertical: ms(10),
    fontSize: ms(16),
    fontFamily: font.regular,
    minHeight: 44,
  },
  error: { fontFamily: font.medium, fontSize: ms(14), marginBottom: space.sm },
});

import { Eye, EyeOff } from 'lucide-react-native';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { font, iconSize, ms, space } from '../constants';
import { useColors } from '../hooks/useColors';
import { Icon } from './Icon';

/** Labelled input. With `secureTextEntry` it gets an eye button to show/hide the text. */
export function Field({ label, secureTextEntry, ...props }: TextInputProps & { label: string }) {
  const c = useColors();
  const [hidden, setHidden] = useState(true);
  return (
    <View style={styles.field}>
      <Label>{label}</Label>
      <View>
        <TextInput
          testID={`field-${slug(label)}`}
          accessibilityLabel={label}
          placeholderTextColor={c.muted}
          secureTextEntry={secureTextEntry && hidden}
          style={[
            styles.input,
            { color: c.ink, borderColor: c.line, backgroundColor: c.bg },
            secureTextEntry && styles.withToggle,
          ]}
          {...props}
        />
        {secureTextEntry ? (
          <Pressable
            onPress={() => setHidden(h => !h)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            hitSlop={8}
            style={styles.toggle}
          >
            <Icon as={hidden ? Eye : EyeOff} size="md" color={c.muted} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

/** "New password (8+ characters)" -> "new-password-8-characters": stable ids for E2E tests. */
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

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
  withToggle: { paddingRight: iconSize.md + space.lg * 1.5 },
  toggle: { position: 'absolute', right: 0, top: 0, bottom: 0, width: iconSize.md + space.lg * 1.5, alignItems: 'center', justifyContent: 'center' },
  error: { fontFamily: font.medium, fontSize: ms(14), marginBottom: space.sm },
});

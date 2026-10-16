import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { avatarInk, avatarPalette, font, ms } from '../constants';

const hash = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('');

/** Initials on a colour that stays the same for a person everywhere in the app. */
export function Avatar({ id, name, size = 40, faded }: { id: string; name: string; size?: number; faded?: boolean }) {
  const d = ms(size);
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.circle,
        { width: d, height: d, borderRadius: d / 2, backgroundColor: avatarPalette[hash(id) % avatarPalette.length], opacity: faded ? 0.45 : 1 },
      ]}
    >
      <Text style={[styles.text, { fontSize: d * 0.38 }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  text: { color: avatarInk, fontFamily: font.bold },
});

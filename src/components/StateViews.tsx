import { CloudOff } from 'lucide-react-native';
import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { space } from '../constants';
import { useColors } from '../hooks/useColors';
import { Button } from './Button';
import { Icon } from './Icon';
import { T } from './Text';

export function LoadingState() {
  const c = useColors();
  return (
    <View style={[styles.center, { backgroundColor: c.bg }]} accessibilityLabel="Loading">
      <ActivityIndicator color={c.accent} size="large" />
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  const c = useColors();
  return (
    <View style={[styles.center, { backgroundColor: c.bg }]}>
      <Icon as={CloudOff} size="lg" color={c.muted} />
      <T strong size={17}>Couldn't load your flat</T>
      <T muted>{message}</T>
      <Button title="Try again" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
});

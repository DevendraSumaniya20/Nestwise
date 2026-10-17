import React from 'react';
import { StyleSheet, View } from 'react-native';
import { space } from '../constants';
import { T } from './Text';

export function Empty({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.empty}>
      <T muted>{children}</T>
    </View>
  );
}

const styles = StyleSheet.create({ empty: { paddingVertical: space.md } });

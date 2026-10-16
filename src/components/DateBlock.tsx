import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { font, ms } from '../constants';
import { useColors } from '../hooks/useColors';

const MONTHS = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');

/** "Oct / 16" stacked, as in an expense list. */
export function DateBlock({ date }: { date: string }) {
  const c = useColors();
  const [, m, d] = date.split('-');
  return (
    <View style={styles.block}>
      <Text style={[styles.month, { color: c.muted }]}>{MONTHS[Number(m) - 1]}</Text>
      <Text style={[styles.day, { color: c.muted }]}>{Number(d)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { width: ms(30), alignItems: 'center' },
  month: { fontFamily: font.medium, fontSize: ms(11) },
  day: { fontFamily: font.semibold, fontSize: ms(17), lineHeight: ms(20) },
});

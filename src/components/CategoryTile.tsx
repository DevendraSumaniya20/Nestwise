import React from 'react';
import { StyleSheet, View } from 'react-native';
import { categoryHue, categoryIcon, ms } from '../constants';
import type { ExpenseCategory } from '../types';
import { Icon } from './Icon';

/** Rounded square with the category icon, Splitwise-style. */
export function CategoryTile({ category }: { category: ExpenseCategory }) {
  const hue = categoryHue[category] ?? categoryHue.Other!;
  return (
    <View style={[styles.tile, { backgroundColor: `${hue}22` }]}>
      <Icon as={categoryIcon[category]} size="md" color={hue} />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { width: ms(42), height: ms(42), borderRadius: ms(10), alignItems: 'center', justifyContent: 'center' },
});

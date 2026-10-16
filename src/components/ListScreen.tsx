import { FlashList } from '@shopify/flash-list';
import React from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, ms, radius, space } from '../constants';
import { useColors } from '../hooks/useColors';
import { T } from './Text';
import { ScreenHeader, useRefresh } from './Screen';

type Props<T> = {
  title: string;
  subtitle?: string;
  onRefresh?: () => Promise<unknown>;
  /** Cards shown above the list. */
  header?: React.ReactNode;
  /** Shown below the list. */
  footer?: React.ReactNode;
  /** Heading of the card the list rows sit in. */
  listTitle: string;
  emptyText: string;
  data: readonly T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => React.ReactElement;
};

/**
 * A screen whose main content is a long list: rows are virtualised by FlashList
 * (only what's on screen is rendered), styled as one card under `listTitle`.
 */
export function ListScreen<T>({ title, subtitle, onRefresh, header, footer, listTitle, emptyText, data, keyExtractor, renderItem }: Props<T>) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { refreshing, refresh } = useRefresh(onRefresh);
  const card = { backgroundColor: c.card, borderColor: c.line };
  const last = data.length - 1;

  return (
    <FlashList
      data={data}
      keyExtractor={keyExtractor}
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={{ ...styles.content, paddingTop: insets.top + space.md }}
      keyboardShouldPersistTaps="handled"
      refreshControl={refresh ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={c.accent} colors={[c.accent]} /> : undefined}
      ListHeaderComponent={
        <View style={styles.header}>
          <ScreenHeader title={title} subtitle={subtitle} />
          {header}
          <View style={[styles.cardTop, card, data.length === 0 && styles.cardBottom]}>
            <Text style={[styles.cardTitle, { color: c.muted }]}>{listTitle.toUpperCase()}</Text>
            {data.length === 0 ? <T muted>{emptyText}</T> : null}
          </View>
        </View>
      }
      renderItem={({ item, index }) => (
        <View style={[styles.item, card, index === last && styles.cardBottom]}>{renderItem(item)}</View>
      )}
      ListFooterComponent={footer ? <View style={styles.footer}>{footer}</View> : null}
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space.lg, paddingBottom: ms(32) },
  header: { gap: space.md },
  cardTop: {
    borderTopLeftRadius: radius,
    borderTopRightRadius: radius,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    padding: space.lg,
    paddingBottom: space.sm,
    gap: space.sm,
  },
  cardTitle: { fontSize: ms(11), fontFamily: font.bold, letterSpacing: 0.9 },
  item: { borderLeftWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth, paddingHorizontal: space.lg },
  cardBottom: {
    borderBottomLeftRadius: radius,
    borderBottomRightRadius: radius,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingBottom: space.sm,
  },
  footer: { marginTop: space.md },
});

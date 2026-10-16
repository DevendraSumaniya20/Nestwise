import { FlashList } from '@shopify/flash-list';
import React from 'react';
import { RefreshControl, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
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
  /** Distinct row kinds (e.g. month heading vs expense) so FlashList recycles like with like. */
  getItemType?: (item: T) => string;
  /** Extra space under the list, e.g. for a floating button. */
  bottomInset?: number;
};

/**
 * A screen whose main content is a long list: rows are virtualised by FlashList
 * (only what's on screen is rendered), styled as one card under `listTitle`.
 */
export function ListScreen<T>({ title, subtitle, onRefresh, header, footer, listTitle, emptyText, data, keyExtractor, renderItem, getItemType, bottomInset = 0 }: Props<T>) {
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
      getItemType={getItemType}
      contentContainerStyle={{ ...styles.content, paddingTop: insets.top + space.md, paddingBottom: ms(32) + bottomInset }}
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
        <View style={[styles.item, card, index === last && styles.cardBottom]}>
          {/* Rows cascade in on first show; capped so long lists don't wait. */}
          <Animated.View entering={FadeIn.delay(Math.min(index, 10) * 35).duration(250)}>{renderItem(item)}</Animated.View>
        </View>
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

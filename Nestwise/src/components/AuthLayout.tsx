import { House } from 'lucide-react-native';
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, ms, radius, space } from '../constants';
import { useColors } from '../hooks/useColors';
import { Icon } from './Icon';

/** Shell for login/register/reset: brand mark, title, then the form card. */
export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={[styles.flex, { backgroundColor: c.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.xl, paddingBottom: insets.bottom + space.xl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View entering={FadeIn.duration(350)} style={styles.brand}>
          <View style={[styles.mark, { backgroundColor: c.accent }]}>
            <Icon as={House} size="lg" color={c.accentInk} />
          </View>
          <Text style={[styles.wordmark, { color: c.ink }]}>Nestwise</Text>
        </Animated.View>
        <Animated.View entering={FadeIn.delay(80).duration(350)}>
          <Text style={[styles.title, { color: c.ink }]} accessibilityRole="header">{title}</Text>
          <Text style={[styles.subtitle, { color: c.muted }]}>{subtitle}</Text>
        </Animated.View>
        <Animated.View
          entering={FadeIn.delay(160).duration(350)}
          style={[styles.card, { backgroundColor: c.card, borderColor: c.line }]}
        >
          {children}
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: space.lg, gap: space.lg, justifyContent: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  mark: { width: ms(40), height: ms(40), borderRadius: ms(12), alignItems: 'center', justifyContent: 'center' },
  wordmark: { fontFamily: font.extrabold, fontSize: ms(20) },
  title: { fontFamily: font.extrabold, fontSize: ms(28), letterSpacing: -0.5 },
  subtitle: { fontFamily: font.regular, fontSize: ms(15), marginTop: space.xs },
  card: { borderRadius: radius, borderWidth: StyleSheet.hairlineWidth, padding: space.lg, gap: space.md },
});

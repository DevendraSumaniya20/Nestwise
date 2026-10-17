import { X } from 'lucide-react-native';
import React from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, ms, radius, space } from '../constants';
import { useColors } from '../hooks/useColors';
import { Icon } from './Icon';

/** Bottom sheet over a dimmed screen; fades in and out. Tap outside or ✕ to close. */
export function Sheet({ visible, title, onClose, children }: { visible: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        </View>
        <View style={[styles.panel, { backgroundColor: c.card, paddingBottom: insets.bottom + space.lg }]}>
          <View style={[styles.grabber, { backgroundColor: c.line }]} />
          <View style={styles.head}>
            <Text style={[styles.title, { color: c.ink }]} accessibilityRole="header">{title}</Text>
            <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Icon as={X} size="md" color={c.muted} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  panel: { maxHeight: '88%', borderTopLeftRadius: radius * 1.5, borderTopRightRadius: radius * 1.5, paddingHorizontal: space.lg },
  grabber: { alignSelf: 'center', width: ms(40), height: 4, borderRadius: 2, marginTop: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: space.md },
  title: { fontFamily: font.extrabold, fontSize: ms(20) },
  body: { gap: space.sm, paddingBottom: space.md },
});

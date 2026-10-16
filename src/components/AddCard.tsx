import { Plus } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useT } from '../i18n';
import { Button } from './Button';
import { Card } from './Card';

/** Card with a collapsible add form. */
export function AddCard({ title, children }: { title: string; children: (close: () => void) => React.ReactNode }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  return open ? (
    <Card title={title} action={<Button kind="ghost" title={t.common.cancel} onPress={() => setOpen(false)} />}>
      {children(() => setOpen(false))}
    </Card>
  ) : (
    <View style={styles.spacer}>
      <Button kind="ghost" icon={Plus} title={title} onPress={() => setOpen(true)} />
    </View>
  );
}

const styles = StyleSheet.create({ spacer: { alignItems: 'flex-start' } });

import React, { useState } from 'react';
import { AuthLayout, Button, ErrorText, Field, T } from '../components';
import { useAuth, useSubmit } from '../hooks';
import { useT } from '../i18n';
import { useAppDispatch } from '../store';
import { createFlat, joinFlat } from '../store/flatSlice';

/** First run after sign-up: create a flat or join one by code. */
export function FlatSetupScreen() {
  const t = useT();
  const { logout } = useAuth();
  const dispatch = useAppDispatch();
  const { busy, error, setError, run } = useSubmit();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');

  return (
    <AuthLayout title={t.setup.title} subtitle={t.setup.subtitle}>
      <ErrorText>{error}</ErrorText>
      <T strong>{t.setup.createTitle}</T>
      <Field label={t.setup.flatName} value={name} onChangeText={setName} placeholder="Sunrise Apartment" />
      <Button
        title={t.setup.create}
        disabled={busy}
        onPress={() =>
          name.trim() ? run(() => dispatch(createFlat(name.trim())).unwrap().then(() => {}, toError)) : setError('Name your flat.')
        }
      />
      <T strong>{t.setup.joinTitle}</T>
      <Field label={t.setup.joinCode} value={code} onChangeText={v => setCode(v.toUpperCase())} autoCapitalize="characters" maxLength={8} />
      <Button
        kind="ghost"
        title={t.setup.join}
        disabled={busy}
        onPress={() =>
          code.trim().length === 8 ? run(() => dispatch(joinFlat(code.trim())).unwrap().then(() => {}, toError)) : setError('Join codes are 8 characters.')
        }
      />
      <Button kind="ghost" title={t.common.logout} onPress={logout} />
    </AuthLayout>
  );
}

const toError = (e: unknown) => {
  throw new Error(typeof e === 'string' ? e : 'Something went wrong.');
};

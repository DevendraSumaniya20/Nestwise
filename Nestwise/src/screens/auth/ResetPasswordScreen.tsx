import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { AuthLayout, Button, ErrorText, Field } from '../../components';
import { useAuth, useSubmit } from '../../hooks';
import { useT } from '../../i18n';
import type { AuthStackParams } from '../../navigation/types';

export function ResetPasswordScreen({ navigation, route }: NativeStackScreenProps<AuthStackParams, 'ResetPassword'>) {
  const t = useT();
  const { email } = route.params;
  const { resetPassword } = useAuth();
  const { busy, error, setError, run } = useSubmit();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');

  const submit = () => {
    if (!/^\d{6}$/.test(code)) return setError('The code is 6 digits.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    // Success logs the user in, which swaps the whole navigator to the app.
    run(() => resetPassword(email, code, password));
  };

  return (
    <AuthLayout title={t.auth.resetTitle} subtitle={t.auth.resetSubtitle(email)}>
      <ErrorText>{error}</ErrorText>
      <Field label={t.auth.code} value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" textContentType="oneTimeCode" />
      <Field label={t.auth.newPassword} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" onSubmitEditing={submit} />
      <Button title={busy ? '…' : t.auth.reset} onPress={submit} disabled={busy} />
      <Button kind="ghost" title={t.auth.back} onPress={() => navigation.navigate('Login')} />
    </AuthLayout>
  );
}

import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { AuthLayout, Button, ErrorText, Field } from '../../components';
import { useAuth, useSubmit } from '../../hooks';
import { useT } from '../../i18n';
import type { AuthStackParams } from '../../navigation/types';

export function ForgotPasswordScreen({ navigation }: NativeStackScreenProps<AuthStackParams, 'ForgotPassword'>) {
  const t = useT();
  const { forgotPassword } = useAuth();
  const { busy, error, setError, run } = useSubmit();
  const [email, setEmail] = useState('');

  const submit = () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email.');
    run(async () => {
      await forgotPassword(email.trim());
      navigation.navigate('ResetPassword', { email: email.trim() });
    });
  };

  return (
    <AuthLayout title={t.auth.forgotTitle} subtitle={t.auth.forgotSubtitle}>
      <ErrorText>{error}</ErrorText>
      <Field label={t.auth.email} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" onSubmitEditing={submit} />
      <Button title={busy ? '…' : t.auth.sendCode} onPress={submit} disabled={busy} />
      <Button kind="ghost" title={t.auth.back} onPress={() => navigation.navigate('Login')} />
    </AuthLayout>
  );
}

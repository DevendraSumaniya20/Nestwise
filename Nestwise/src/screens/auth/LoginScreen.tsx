import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { AuthLayout, Button, ErrorText, Field } from '../../components';
import { useAuth, useSubmit } from '../../hooks';
import { useT } from '../../i18n';
import type { AuthStackParams } from '../../navigation/types';

export function LoginScreen({ navigation }: NativeStackScreenProps<AuthStackParams, 'Login'>) {
  const t = useT();
  const { login } = useAuth();
  const { busy, error, setError, run } = useSubmit();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = () => {
    if (!email.trim() || !password) return setError('Enter your email and password.');
    run(() => login(email.trim(), password));
  };

  return (
    <AuthLayout title={t.auth.loginTitle} subtitle={t.auth.loginSubtitle}>
      <ErrorText>{error}</ErrorText>
      <Field label={t.auth.email} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
      <Field label={t.auth.password} value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" onSubmitEditing={submit} />
      <Button title={busy ? '…' : t.auth.login} onPress={submit} disabled={busy} />
      <Button kind="ghost" title={t.auth.forgot} onPress={() => navigation.navigate('ForgotPassword')} />
      <Button kind="ghost" title={t.auth.toRegister} onPress={() => navigation.navigate('Register')} />
    </AuthLayout>
  );
}

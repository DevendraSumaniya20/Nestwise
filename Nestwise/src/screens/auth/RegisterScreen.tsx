import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { AuthLayout, Button, ErrorText, Field } from '../../components';
import { useAuth, useSubmit } from '../../hooks';
import { useT } from '../../i18n';
import type { AuthStackParams } from '../../navigation/types';

export function RegisterScreen({ navigation }: NativeStackScreenProps<AuthStackParams, 'Register'>) {
  const t = useT();
  const { register } = useAuth();
  const { busy, error, setError, run } = useSubmit();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const submit = () => {
    if (!name.trim()) return setError('Add your name so flatmates know who you are.');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email.');
    if (password.length < 8) return setError('Password must be at least 8 characters.');
    run(() => register(name.trim(), email.trim(), password));
  };

  return (
    <AuthLayout title={t.auth.registerTitle} subtitle={t.auth.registerSubtitle}>
      <ErrorText>{error}</ErrorText>
      <Field label={t.auth.name} value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
      <Field label={t.auth.email} value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
      <Field label={t.auth.newPassword} value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" onSubmitEditing={submit} />
      <Button title={busy ? '…' : t.auth.register} onPress={submit} disabled={busy} />
      <Button kind="ghost" title={t.auth.toLogin} onPress={() => navigation.navigate('Login')} />
    </AuthLayout>
  );
}

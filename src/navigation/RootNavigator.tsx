import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { ErrorState, LoadingState } from '../components';
import { useAuth, useColors } from '../hooks';
import {
  FlatSetupScreen,
  ForgotPasswordScreen,
  LoginScreen,
  RegisterScreen,
  ResetPasswordScreen,
} from '../screens';
import { useAppDispatch, useAppSelector } from '../store';
import { bootstrap } from '../store/authSlice';
import { loadFlat } from '../store/flatSlice';
import { RootTabs } from './RootTabs';
import type { AuthStackParams } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParams>();

/** Signed out → auth stack. Signed in → flat setup (if no flat) or the tabs. */
export function RootNavigator() {
  const c = useColors();
  const dispatch = useAppDispatch();
  const { user, ready, offline } = useAuth();
  const base = useColorScheme() === 'dark' ? DarkTheme : DefaultTheme;

  useEffect(() => {
    dispatch(bootstrap());
  }, [dispatch]);

  if (offline) return <ErrorState title="You're offline" message="Cannot reach the Nestwise server. Check your connection." onRetry={() => dispatch(bootstrap())} />;
  if (!ready) return <LoadingState />;

  return (
    <NavigationContainer
      theme={{
        ...base,
        colors: { ...base.colors, primary: c.accent, background: c.bg, card: c.card, text: c.ink, border: c.line },
      }}
    >
      {user ? (
        // Keyed by user so switching accounts never shows the previous flat.
        <FlatGate key={user.id} />
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
          <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}

/** Loads the signed-in user's flat, then shows setup, an error, or the tabs. */
function FlatGate() {
  const dispatch = useAppDispatch();
  const { status, error } = useAppSelector(s => s.flat);
  useEffect(() => {
    dispatch(loadFlat());
  }, [dispatch]);

  if (status === 'none') return <FlatSetupScreen />;
  if (status === 'error') return <ErrorState message={error} onRetry={() => dispatch(loadFlat())} />;
  if (status !== 'ready') return <LoadingState />;
  return <RootTabs />;
}

import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
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
import { FlatProvider } from '../store/FlatProvider';
import { RootTabs } from './RootTabs';
import type { AuthStackParams } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParams>();

/** Signed out → auth stack. Signed in → flat setup (if no flat) or the tabs. */
export function RootNavigator() {
  const c = useColors();
  const { user, ready } = useAuth();
  const base = useColorScheme() === 'dark' ? DarkTheme : DefaultTheme;

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
        <FlatProvider
          key={user.id}
          fallback={<LoadingState />}
          noFlat={onReady => <FlatSetupScreen onReady={onReady} />}
          errorView={(message, retry) => <ErrorState message={message} onRetry={retry} />}
        >
          <RootTabs />
        </FlatProvider>
      ) : (
        <AuthStack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <AuthStack.Screen name="Login" component={LoginScreen} />
          <AuthStack.Screen name="Register" component={RegisterScreen} />
          <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
        </AuthStack.Navigator>
      )}
    </NavigationContainer>
  );
}

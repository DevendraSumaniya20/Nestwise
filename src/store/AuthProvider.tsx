import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  type AuthResult,
  authApi,
  setAuthToken,
  setUnauthorizedHandler,
  tokenStore,
  type User,
} from '../services/api';

type AuthCtx = {
  user: User | null;
  /** False until the saved session has been checked. */
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<string>;
  resetPassword: (email: string, code: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const signOutLocally = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    await tokenStore.clear().catch(() => {});
  }, []);

  const accept = useCallback(async ({ token, user: u }: AuthResult) => {
    await tokenStore.set(token);
    setAuthToken(token);
    setUser(u);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => void signOutLocally());
    (async () => {
      const token = await tokenStore.get().catch(() => null);
      if (token) {
        setAuthToken(token);
        try {
          setUser((await authApi.me()).user);
        } catch {
          // Offline or expired: show login; an expired token is already cleared by the 401 handler.
          setAuthToken(null);
        }
      }
      setReady(true);
    })();
  }, [signOutLocally]);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      ready,
      login: async (email, password) => accept(await authApi.login({ email, password })),
      register: async (name, email, password) => accept(await authApi.register({ name, email, password })),
      forgotPassword: async email => (await authApi.forgotPassword(email)).message,
      resetPassword: async (email, code, password) => accept(await authApi.resetPassword({ email, code, password })),
      logout: async () => {
        await authApi.logout().catch(() => {});
        await signOutLocally();
      },
    }),
    [user, ready, accept, signOutLocally],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

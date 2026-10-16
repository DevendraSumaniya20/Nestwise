import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { flatApi } from '../services/api';
import type { FlatState, Member } from '../types';
import { today } from '../utils/dates';
import { type Action, runAction } from './actions';

type Ctx = {
  state: FlatState;
  flatId: string;
  /** Runs the action on the server; resolves true on success (errors are shown to the user). */
  dispatch: (action: Action) => Promise<boolean>;
  refresh: () => Promise<void>;
  today: string;
  me: Member;
  /** Members still living in the flat today. */
  active: Member[];
  nameOf: (id?: string) => string;
};

type Loaded = { flatId: string; state: FlatState };

const FlatContext = createContext<Ctx | null>(null);

export function FlatProvider({
  children,
  fallback,
  noFlat,
  errorView,
}: {
  children: React.ReactNode;
  /** Shown while the first load is in flight. */
  fallback: React.ReactNode;
  /** Shown when the user belongs to no flat yet; gets a setter for the created/joined flat. */
  noFlat: (onReady: () => void) => React.ReactNode;
  errorView: (message: string, retry: () => void) => React.ReactNode;
}) {
  const on = today();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'none' | 'error'>('loading');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { flats } = await flatApi.list();
      const first = flats[0];
      if (!first) return setStatus('none');
      setLoaded({ flatId: first.id, state: await flatApi.state(first.id) });
      setStatus('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onReady = useCallback(() => {
    setStatus('loading');
    load();
  }, [load]);

  const value = useMemo<Ctx | null>(() => {
    if (!loaded) return null;
    const { state, flatId } = loaded;
    const byId = new Map(state.members.map(m => [m.id, m]));
    return {
      state,
      flatId,
      dispatch: async action => {
        try {
          const next = await runAction(flatId, state, action);
          setLoaded({ flatId, state: next });
          return true;
        } catch (e) {
          Alert.alert('Could not save', e instanceof Error ? e.message : String(e));
          return false;
        }
      },
      refresh: async () => setLoaded({ flatId, state: await flatApi.state(flatId) }),
      today: on,
      me: byId.get(state.currentUserId) ?? state.members[0],
      active: state.members.filter(m => !m.moveOut || m.moveOut >= on),
      nameOf: id => (id ? byId.get(id)?.name ?? 'Unknown' : 'Anyone'),
    };
  }, [loaded, on]);

  if (status === 'none') return <>{noFlat(onReady)}</>;
  if (status === 'error') return <>{errorView(error, onReady)}</>;
  if (!value) return <>{fallback}</>;
  return <FlatContext.Provider value={value}>{children}</FlatContext.Provider>;
}

export function useFlat(): Ctx {
  const ctx = useContext(FlatContext);
  if (!ctx) throw new Error('useFlat must be used inside FlatProvider');
  return ctx;
}

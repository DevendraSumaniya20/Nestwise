import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { today } from '../utils/dates';
import type { FlatRepository } from '../services/FlatRepository';
import type { FlatState, Member } from '../types';
import { seedFlat } from '../data/seed';
import { type Action, flatReducer } from './flatReducer';

type Ctx = {
  state: FlatState;
  dispatch: React.Dispatch<Action>;
  today: string;
  me: Member;
  /** Members still living in the flat today. */
  active: Member[];
  nameOf: (id?: string) => string;
};

const FlatContext = createContext<Ctx | null>(null);

export function FlatProvider({
  repository,
  children,
}: {
  repository: FlatRepository;
  children: React.ReactNode;
}) {
  const on = today();
  const [state, dispatch] = useReducer(flatReducer, on, seedFlat);
  const [ready, setReady] = useState(false);
  const loaded = useRef(false);

  useEffect(() => {
    repository
      .load()
      .then(saved => saved && dispatch({ type: 'hydrate', state: saved }))
      .catch(e => console.warn('[Nestwise] load failed, using demo flat', e))
      .finally(() => {
        loaded.current = true;
        setReady(true);
      });
  }, [repository]);

  useEffect(() => {
    // Never save before load finishes, or the demo seed would overwrite real data.
    if (!loaded.current) return;
    repository
      .save(state)
      .catch(e => console.warn('[Nestwise] save failed', e));
  }, [repository, state]);

  const value = useMemo<Ctx>(() => {
    const byId = new Map(state.members.map(m => [m.id, m]));
    return {
      state,
      dispatch,
      today: on,
      me: byId.get(state.currentUserId) ?? state.members[0],
      active: state.members.filter(m => !m.moveOut || m.moveOut >= on),
      nameOf: id => (id ? byId.get(id)?.name ?? 'Unknown' : 'Anyone'),
    };
  }, [state, on]);

  if (!ready) return null;
  return <FlatContext.Provider value={value}>{children}</FlatContext.Provider>;
}

export function useFlat(): Ctx {
  const ctx = useContext(FlatContext);
  if (!ctx) throw new Error('useFlat must be used inside FlatProvider');
  return ctx;
}

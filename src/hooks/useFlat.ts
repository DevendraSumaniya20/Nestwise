import { useMemo } from 'react';
import { Alert } from 'react-native';
import { useAppDispatch, useAppSelector } from '../store';
import type { Action } from '../store/actions';
import { loadFlat, runFlatAction } from '../store/flatSlice';
import { today } from '../utils/dates';

/** The loaded flat plus helpers. Only use under the flat gate (data is loaded). */
export function useFlat() {
  const appDispatch = useAppDispatch();
  const { data, flatId } = useAppSelector(s => s.flat);
  const on = today();

  const ctx = useMemo(() => {
    if (!data || !flatId) return null;
    const byId = new Map(data.members.map(m => [m.id, m]));
    return {
      state: data,
      flatId,
      /** Runs the action on the server; resolves true on success, shows the error otherwise. */
      dispatch: async (action: Action): Promise<boolean> => {
        try {
          await appDispatch(runFlatAction(action)).unwrap();
          return true;
        } catch (e) {
          Alert.alert('Could not save', typeof e === 'string' ? e : 'Please try again.');
          return false;
        }
      },
      refresh: () => appDispatch(loadFlat()),
      today: on,
      me: byId.get(data.currentUserId) ?? data.members[0],
      active: data.members.filter(m => !m.moveOut || m.moveOut >= on),
      nameOf: (id?: string) => (id ? byId.get(id)?.name ?? 'Unknown' : 'Anyone'),
    };
  }, [data, flatId, on, appDispatch]);
  if (!ctx) throw new Error('useFlat used before the flat loaded');
  return ctx;
}

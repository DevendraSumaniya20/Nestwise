import { useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import * as auth from '../store/authSlice';

/** Auth state + actions. Actions throw the server's message so forms can show it. */
export function useAuth() {
  const dispatch = useAppDispatch();
  const { user, status } = useAppSelector(s => s.auth);
  const actions = useMemo(
    () => ({
      login: async (email: string, password: string) => {
        await dispatch(auth.login({ email, password })).unwrap().catch(fail);
      },
      register: async (name: string, email: string, password: string) => {
        await dispatch(auth.register({ name, email, password })).unwrap().catch(fail);
      },
      forgotPassword: (email: string) => dispatch(auth.forgotPassword(email)).unwrap().catch(fail),
      resetPassword: async (email: string, code: string, password: string) => {
        await dispatch(auth.resetPassword({ email, code, password })).unwrap().catch(fail);
      },
      logout: async () => {
        await dispatch(auth.logout());
      },
    }),
    [dispatch],
  );
  return { user, ready: status === 'ready', offline: status === 'offline', ...actions };
}

// unwrap() rejects with the rejectValue string; turn it back into an Error for useSubmit.
function fail(e: unknown): never {
  throw e instanceof Error ? e : new Error(typeof e === 'string' ? e : 'Something went wrong.');
}

import { configureStore } from '@reduxjs/toolkit';
import auth, { login, logout, sessionEnded } from '../authSlice';
import flat, { loadFlat, runFlatAction } from '../flatSlice';
import type { FlatState } from '../../types';

const flatState = { version: 1, flatName: 'F', currentUserId: 'm1', members: [], expenses: [], bills: [], meals: [], groceries: [], tasks: [] } as FlatState;
const user = { id: 'u1', email: 'a@b.c', name: 'A' };
const makeStore = () => configureStore({ reducer: { auth, flat } });

test('login sets the user; logout and session end clear user and flat', () => {
  const store = makeStore();
  store.dispatch({ type: login.fulfilled.type, payload: user });
  store.dispatch({ type: loadFlat.fulfilled.type, payload: { flatId: 'f1', data: flatState } });
  expect(store.getState().auth.user).toEqual(user);
  expect(store.getState().flat.status).toBe('ready');

  store.dispatch({ type: logout.fulfilled.type });
  expect(store.getState().auth.user).toBeNull();
  expect(store.getState().flat).toMatchObject({ status: 'idle', data: null });

  store.dispatch({ type: login.fulfilled.type, payload: user });
  store.dispatch({ type: loadFlat.fulfilled.type, payload: { flatId: 'f1', data: flatState } });
  store.dispatch(sessionEnded());
  expect(store.getState().flat.data).toBeNull();
});

test('no flat yet -> "none"; a failed refresh keeps the flat on screen', () => {
  const store = makeStore();
  store.dispatch({ type: loadFlat.fulfilled.type, payload: null });
  expect(store.getState().flat.status).toBe('none');

  store.dispatch({ type: loadFlat.fulfilled.type, payload: { flatId: 'f1', data: flatState } });
  store.dispatch({ type: loadFlat.rejected.type, payload: 'offline' });
  expect(store.getState().flat).toMatchObject({ status: 'ready', data: flatState });
});

test('first load failing shows the error', () => {
  const store = makeStore();
  store.dispatch({ type: loadFlat.rejected.type, payload: 'Cannot reach server' });
  expect(store.getState().flat).toMatchObject({ status: 'error', error: 'Cannot reach server' });
});

test('a successful action replaces the flat with the server response', () => {
  const store = makeStore();
  store.dispatch({ type: loadFlat.fulfilled.type, payload: { flatId: 'f1', data: flatState } });
  store.dispatch({ type: runFlatAction.fulfilled.type, payload: { ...flatState, flatName: 'Renamed' } });
  expect(store.getState().flat.data?.flatName).toBe('Renamed');
});

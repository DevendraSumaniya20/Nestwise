import { configureStore } from '@reduxjs/toolkit';
import { type TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { setSessionEndedHandler } from '../services/api';
import auth, { sessionEnded } from './authSlice';
import flat from './flatSlice';

export const store = configureStore({ reducer: { auth, flat } });

// The API client can't import the store (cycle), so it reports a dead session through this hook.
setSessionEndedHandler(() => store.dispatch(sessionEnded()));

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

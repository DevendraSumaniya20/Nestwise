import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { type FlatSummary, flatApi } from '../services/api';
import { lastFlatStore } from '../services/lastFlatStore';
import type { FlatState } from '../types';
import { type Action, runAction } from './actions';
import { logout, sessionEnded } from './authSlice';

type FlatSliceState = {
  status: 'idle' | 'loading' | 'ready' | 'none' | 'error';
  flatId: string | null;
  data: FlatState | null;
  /** Every home the user belongs to, for the switcher. */
  flats: FlatSummary[];
  error: string;
};

const initialState: FlatSliceState = { status: 'idle', flatId: null, data: null, flats: [], error: '' };
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Loads a home: the one asked for, else the one on screen, else the last one opened
 * on this device, else the first. Refreshes the list of homes too.
 */
export const loadFlat = createAsyncThunk<
  { flatId: string; data: FlatState; flats: FlatSummary[] } | null,
  string | undefined,
  { state: { flat: FlatSliceState }; rejectValue: string }
>('flat/load', async (wanted, { getState, rejectWithValue }) => {
  try {
    const { flats } = await flatApi.list();
    const id = wanted ?? getState().flat.flatId ?? (await lastFlatStore.get());
    const pick = flats.find(f => f.id === id) ?? flats[0];
    if (!pick) return null;
    lastFlatStore.set(pick.id).catch(() => {});
    return { flatId: pick.id, data: await flatApi.state(pick.id), flats };
  } catch (e) {
    return rejectWithValue(message(e));
  }
});

/** Opens the home that a create/join just added (or stays put if it was already ours). */
async function openNewest(before: FlatSummary[], dispatch: (a: ReturnType<typeof loadFlat>) => unknown) {
  const known = new Set(before.map(f => f.id));
  const added = (await flatApi.list()).flats.find(f => !known.has(f.id));
  await dispatch(loadFlat(added?.id));
}

/** Runs one user action on the server; the response is the fresh flat state. */
export const runFlatAction = createAsyncThunk<FlatState, Action, { state: { flat: FlatSliceState }; rejectValue: string }>(
  'flat/action',
  async (action, { getState, rejectWithValue }) => {
    const { flatId, data } = getState().flat;
    if (!flatId || !data) return rejectWithValue('No flat loaded.');
    return runAction(flatId, data, action).catch(e => rejectWithValue(message(e)));
  },
);

export const createFlat = createAsyncThunk<void, string, { state: { flat: FlatSliceState }; rejectValue: string }>(
  'flat/create',
  async (name, { dispatch, getState, rejectWithValue }) => {
    const before = getState().flat.flats;
    try {
      await flatApi.create(name);
    } catch (e) {
      return rejectWithValue(message(e));
    }
    await openNewest(before, dispatch);
  },
);

export const joinFlat = createAsyncThunk<void, string, { state: { flat: FlatSliceState }; rejectValue: string }>(
  'flat/join',
  async (code, { dispatch, getState, rejectWithValue }) => {
    const before = getState().flat.flats;
    try {
      await flatApi.join(code);
    } catch (e) {
      return rejectWithValue(message(e));
    }
    await openNewest(before, dispatch);
  },
);

const flatSlice = createSlice({
  name: 'flat',
  initialState,
  reducers: {},
  extraReducers: b => {
    b.addCase(loadFlat.pending, state => {
      // Keep showing the current flat during pull-to-refresh.
      if (!state.data) state.status = 'loading';
    });
    b.addCase(loadFlat.fulfilled, (state, a) => {
      if (!a.payload) return { ...initialState, status: 'none' };
      state.status = 'ready';
      state.flatId = a.payload.flatId;
      state.data = a.payload.data;
      state.flats = a.payload.flats ?? [];
      state.error = '';
    });
    b.addCase(loadFlat.rejected, (state, a) => {
      // A failed refresh keeps the data already on screen.
      if (!state.data) {
        state.status = 'error';
        state.error = a.payload ?? 'Could not load your flat.';
      }
    });
    b.addCase(runFlatAction.fulfilled, (state, a) => {
      state.data = a.payload;
    });
    // Signing out must never leave the previous user's flat in memory.
    b.addCase(logout.fulfilled, () => initialState);
    b.addCase(sessionEnded, () => initialState);
  },
});

export default flatSlice.reducer;

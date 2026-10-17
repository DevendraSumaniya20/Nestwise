import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { flatApi } from '../services/api';
import type { FlatState } from '../types';
import { type Action, runAction } from './actions';
import { logout, sessionEnded } from './authSlice';

type FlatSliceState = {
  status: 'idle' | 'loading' | 'ready' | 'none' | 'error';
  flatId: string | null;
  data: FlatState | null;
  error: string;
};

const initialState: FlatSliceState = { status: 'idle', flatId: null, data: null, error: '' };
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Loads the user's first flat (multi-flat switching comes later). */
export const loadFlat = createAsyncThunk<{ flatId: string; data: FlatState } | null, void, { rejectValue: string }>(
  'flat/load',
  async (_, { rejectWithValue }) => {
    try {
      const first = (await flatApi.list()).flats[0];
      return first ? { flatId: first.id, data: await flatApi.state(first.id) } : null;
    } catch (e) {
      return rejectWithValue(message(e));
    }
  },
);

/** Runs one user action on the server; the response is the fresh flat state. */
export const runFlatAction = createAsyncThunk<FlatState, Action, { state: { flat: FlatSliceState }; rejectValue: string }>(
  'flat/action',
  async (action, { getState, rejectWithValue }) => {
    const { flatId, data } = getState().flat;
    if (!flatId || !data) return rejectWithValue('No flat loaded.');
    return runAction(flatId, data, action).catch(e => rejectWithValue(message(e)));
  },
);

export const createFlat = createAsyncThunk<void, string, { rejectValue: string }>(
  'flat/create',
  async (name, { dispatch, rejectWithValue }) => {
    try {
      await flatApi.create(name);
    } catch (e) {
      return rejectWithValue(message(e));
    }
    await dispatch(loadFlat());
  },
);

export const joinFlat = createAsyncThunk<void, string, { rejectValue: string }>(
  'flat/join',
  async (code, { dispatch, rejectWithValue }) => {
    try {
      await flatApi.join(code);
    } catch (e) {
      return rejectWithValue(message(e));
    }
    await dispatch(loadFlat());
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

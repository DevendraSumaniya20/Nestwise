import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { ApiError, type AuthResult, authApi, loadTokens, setTokens, type User } from '../services/api';

type AuthState = {
  user: User | null;
  /** 'checking' until the saved session has been tried; 'offline' if the server couldn't be reached. */
  status: 'checking' | 'ready' | 'offline';
};

const initialState: AuthState = { user: null, status: 'checking' };

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

async function accept(r: AuthResult): Promise<User> {
  await setTokens({ accessToken: r.accessToken, refreshToken: r.refreshToken });
  return r.user;
}

/** Restores the session from secure storage; the API client refreshes an expired access token itself. */
export const bootstrap = createAsyncThunk<User | null, void, { rejectValue: 'offline' }>(
  'auth/bootstrap',
  async (_, { rejectWithValue }) => {
    if (!(await loadTokens())) return null;
    try {
      return (await authApi.me()).user;
    } catch (e) {
      // Offline: keep the saved session and let the user retry, instead of showing login.
      if (e instanceof ApiError && e.status === 0) return rejectWithValue('offline');
      return null;
    }
  },
);

export const login = createAsyncThunk<User, { email: string; password: string }, { rejectValue: string }>(
  'auth/login',
  async (b, { rejectWithValue }) => authApi.login(b).then(accept).catch(e => rejectWithValue(message(e))),
);

export const register = createAsyncThunk<User, { name: string; email: string; password: string }, { rejectValue: string }>(
  'auth/register',
  async (b, { rejectWithValue }) => authApi.register(b).then(accept).catch(e => rejectWithValue(message(e))),
);

export const resetPassword = createAsyncThunk<User, { email: string; code: string; password: string }, { rejectValue: string }>(
  'auth/resetPassword',
  async (b, { rejectWithValue }) => authApi.resetPassword(b).then(accept).catch(e => rejectWithValue(message(e))),
);

export const forgotPassword = createAsyncThunk<string, string, { rejectValue: string }>(
  'auth/forgotPassword',
  async (email, { rejectWithValue }) =>
    authApi
      .forgotPassword(email)
      .then(r => r.message)
      .catch(e => rejectWithValue(message(e))),
);

export const logout = createAsyncThunk('auth/logout', async () => {
  await authApi.logout().catch(() => {});
  await setTokens(null);
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** The refresh token was rejected (expired, revoked, or reused). */
    sessionEnded: state => {
      state.user = null;
    },
  },
  extraReducers: b => {
    b.addCase(bootstrap.fulfilled, (state, a) => {
      state.user = a.payload;
      state.status = 'ready';
    });
    b.addCase(bootstrap.pending, state => {
      state.status = 'checking';
    });
    b.addCase(bootstrap.rejected, (state, a) => {
      state.status = a.payload === 'offline' ? 'offline' : 'ready';
    });
    for (const thunk of [login, register, resetPassword]) {
      b.addCase(thunk.fulfilled, (state, a) => {
        state.user = a.payload;
      });
    }
    b.addCase(logout.fulfilled, state => {
      state.user = null;
    });
  },
});

export const { sessionEnded } = authSlice.actions;
export default authSlice.reducer;

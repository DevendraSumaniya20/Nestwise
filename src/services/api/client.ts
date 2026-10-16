import { API_URL } from './config';
import { type Tokens, tokenStore } from './tokenStore';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

let tokens: Tokens | null = null;
let onSessionEnded: () => void = () => {};
let refreshing: Promise<boolean> | null = null;

/** Sets the in-memory tokens and persists them (or clears them) in secure storage. */
export async function setTokens(next: Tokens | null): Promise<void> {
  tokens = next;
  await (next ? tokenStore.set(next) : tokenStore.clear().then(() => undefined));
}
export async function loadTokens(): Promise<boolean> {
  tokens = await tokenStore.get().catch(() => null);
  return tokens !== null;
}
/** Called when the refresh token is rejected, so the app can return to login. */
export const setSessionEndedHandler = (fn: () => void) => {
  onSessionEnded = fn;
};

async function send(method: Method, path: string, body: unknown, auth: boolean): Promise<Response> {
  try {
    return await fetch(`${API_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
        ...(auth && tokens && { Authorization: `Bearer ${tokens.accessToken}` }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', 'Cannot reach the Nestwise server. Check that it is running and you are online.');
  }
}

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = data?.error;
    const detail = err?.details?.[0];
    throw new ApiError(
      res.status,
      err?.code ?? 'HTTP_ERROR',
      detail?.field ? `${detail.field}: ${detail.message}` : err?.message ?? `Request failed (${res.status}).`,
    );
  }
  return data as T;
}

/** One refresh at a time; parallel 401s all wait for the same result. */
function refreshTokens(): Promise<boolean> {
  refreshing ??= (async () => {
    const refreshToken = tokens?.refreshToken;
    if (!refreshToken) return false;
    const res = await send('POST', '/auth/refresh', { refreshToken }, false).catch(() => null);
    if (!res?.ok) {
      // Network failure keeps the session; a rejected refresh token ends it.
      if (res && res.status === 401) {
        await setTokens(null);
        onSessionEnded();
      }
      return false;
    }
    const next = (await res.json()) as Tokens;
    await setTokens({ accessToken: next.accessToken, refreshToken: next.refreshToken });
    return true;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

/** Authenticated call: on an expired access token, refreshes once and retries. */
export async function api<T>(method: Method, path: string, body?: unknown): Promise<T> {
  let res = await send(method, path, body, true);
  if (res.status === 401 && tokens && (await refreshTokens())) {
    res = await send(method, path, body, true);
  }
  return parse<T>(res);
}

/** Unauthenticated call (login, register, password reset). */
export async function publicApi<T>(method: Method, path: string, body?: unknown): Promise<T> {
  return parse<T>(await send(method, path, body, false));
}

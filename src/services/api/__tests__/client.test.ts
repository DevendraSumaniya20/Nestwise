import * as Keychain from 'react-native-keychain';
import { api, ApiError, loadTokens, setSessionEndedHandler, setTokens } from '../client';

const json = (status: number, body: unknown) =>
  ({ ok: status < 400, status, json: async () => body }) as unknown as Response;

const fetchMock = jest.fn();
globalThis.fetch = fetchMock as unknown as typeof fetch;

beforeEach(async () => {
  fetchMock.mockReset();
  jest.mocked(Keychain.setGenericPassword).mockClear();
  jest.mocked(Keychain.resetGenericPassword).mockClear();
  await setTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' });
});

const authHeader = (call: number) => fetchMock.mock.calls[call][1].headers.Authorization;

test('sends the access token', async () => {
  fetchMock.mockResolvedValueOnce(json(200, { ok: true }));
  await expect(api('GET', '/me')).resolves.toEqual({ ok: true });
  expect(authHeader(0)).toBe('Bearer access-1');
});

test('on 401 it refreshes once, stores the new pair in the keychain, and retries', async () => {
  fetchMock
    .mockResolvedValueOnce(json(401, { error: { code: 'UNAUTHENTICATED' } }))
    .mockResolvedValueOnce(json(200, { accessToken: 'access-2', refreshToken: 'refresh-2' }))
    .mockResolvedValueOnce(json(200, { user: 'me' }));
  await expect(api('GET', '/me')).resolves.toEqual({ user: 'me' });
  expect(fetchMock.mock.calls[1][0]).toMatch(/\/auth\/refresh$/);
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ refreshToken: 'refresh-1' });
  expect(authHeader(2)).toBe('Bearer access-2');
  expect(Keychain.setGenericPassword).toHaveBeenLastCalledWith(
    'session',
    JSON.stringify({ accessToken: 'access-2', refreshToken: 'refresh-2' }),
    expect.objectContaining({ service: 'app.nestwise.session' }),
  );
});

test('parallel 401s share a single refresh call', async () => {
  fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
    if (url.endsWith('/auth/refresh')) return json(200, { accessToken: 'access-2', refreshToken: 'refresh-2' });
    const auth = (init.headers as Record<string, string>).Authorization;
    return auth === 'Bearer access-2' ? json(200, { ok: true }) : json(401, {});
  });
  await Promise.all([api('GET', '/a'), api('GET', '/b'), api('GET', '/c')]);
  expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'))).toHaveLength(1);
});

test('a rejected refresh token clears the keychain and ends the session', async () => {
  const ended = jest.fn();
  setSessionEndedHandler(ended);
  fetchMock.mockResolvedValueOnce(json(401, {})).mockResolvedValueOnce(json(401, {}));
  await expect(api('GET', '/me')).rejects.toBeInstanceOf(ApiError);
  expect(ended).toHaveBeenCalledTimes(1);
  expect(Keychain.resetGenericPassword).toHaveBeenCalled();
});

test('network failure becomes a readable ApiError with status 0', async () => {
  fetchMock.mockRejectedValueOnce(new TypeError('Network request failed'));
  await expect(api('GET', '/me')).rejects.toMatchObject({ status: 0, code: 'NETWORK' });
});

test('server validation details become the error message', async () => {
  fetchMock.mockResolvedValueOnce(
    json(400, { error: { code: 'VALIDATION_FAILED', message: 'x', details: [{ field: 'password', message: 'too short' }] } }),
  );
  await expect(api('POST', '/x', {})).rejects.toThrow('password: too short');
});

test('loadTokens reads both tokens back from the keychain', async () => {
  jest.mocked(Keychain.getGenericPassword).mockResolvedValueOnce({
    service: 's', username: 'session', password: JSON.stringify({ accessToken: 'a', refreshToken: 'r' }), storage: 'x',
  } as never);
  await expect(loadTokens()).resolves.toBe(true);
  jest.mocked(Keychain.getGenericPassword).mockResolvedValueOnce({ password: 'old-plain-token' } as never);
  await expect(loadTokens()).resolves.toBe(false);
});

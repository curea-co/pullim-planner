import { createPullimSessionClient } from '@/lib/api-client/pullim-session';
import { act, render, screen } from '@testing-library/react';
import { ApiError, type PullimMeProfile } from '@/lib/api-client';
import { AuthProvider, useAuth } from '@/lib/auth/auth-context';
import { onPullimSessionExpired, pullimSession } from '@/lib/auth/pullim-session-client';

jest.mock('@/lib/auth/pullim-session-client', () => ({
  pullimSession: {
    session: jest.fn(), accountMe: jest.fn(), entitlements: jest.fn(), updateProfile: jest.fn(),
  },
  onPullimSessionExpired: jest.fn(() => () => {}),
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function Probe() {
  const { status, user, accountEmail, retry } = useAuth();
  return <>
    <output data-testid="identity">{status}:{user?.id ?? '-'}:{accountEmail ?? '-'}</output>
    <button onClick={retry}>retry</button>
  </>;
}

const session = jest.mocked(pullimSession.session);
const accountMe = jest.mocked(pullimSession.accountMe);
const profile = (id: string) => ({ id, name: id } as PullimMeProfile);
const account = (email: string) => ({ email, name: '', displayName: '' });

beforeEach(() => {
  jest.resetAllMocks();
  jest.mocked(onPullimSessionExpired).mockReturnValue(() => {});
  jest.mocked(pullimSession.entitlements).mockResolvedValue({ flags: {} });
});

it.each([200, 403, null])('discards account A response after a replacement session returns %s', async (code) => {
  const oldAccount = deferred<Awaited<ReturnType<typeof accountMe>>>();
  session.mockResolvedValueOnce(profile('A'));
  accountMe.mockReturnValueOnce(oldAccount.promise).mockResolvedValueOnce(account('b@example.com'));
  await act(async () => { render(<AuthProvider><Probe /></AuthProvider>); });
  if (code === 200) session.mockResolvedValueOnce(profile('B'));
  else if (code === null) session.mockResolvedValueOnce(null);
  else session.mockRejectedValueOnce(new ApiError({ code: 'planner', statusCode: code, message: 'profile unavailable' }));

  await act(async () => { screen.getByText('retry').click(); });
  await act(async () => { oldAccount.resolve(account('a@example.com')); });

  expect(screen.getByTestId('identity')).toHaveTextContent('b@example.com');
  expect(screen.getByTestId('identity')).not.toHaveTextContent('a@example.com');
});

it('clears an already displayed email before the new account lookup completes', async () => {
  session.mockResolvedValueOnce(profile('A')).mockResolvedValueOnce(profile('B'));
  accountMe.mockResolvedValueOnce(account('a@example.com'))
    .mockReturnValueOnce(deferred<Awaited<ReturnType<typeof accountMe>>>().promise);
  await act(async () => { render(<AuthProvider><Probe /></AuthProvider>); });

  await act(async () => { screen.getByText('retry').click(); });

  expect(screen.getByTestId('identity')).toHaveTextContent('authenticated:B:-');
});

it('ignores an older session result that finishes after a newer resolution', async () => {
  const oldSession = deferred<PullimMeProfile | null>();
  session.mockReturnValueOnce(oldSession.promise).mockResolvedValueOnce(profile('B'));
  accountMe.mockResolvedValue(account('b@example.com'));
  await act(async () => { render(<AuthProvider><Probe /></AuthProvider>); });
  await act(async () => { screen.getByText('retry').click(); });

  await act(async () => { oldSession.resolve(profile('A')); });

  expect(screen.getByTestId('identity')).toHaveTextContent('authenticated:B:b@example.com');
  expect(accountMe).toHaveBeenCalledTimes(1);
});

it('does not restore a pending session after a session-expired event', async () => {
  const oldSession = deferred<PullimMeProfile | null>();
  session.mockReturnValueOnce(oldSession.promise);
  await act(async () => { render(<AuthProvider><Probe /></AuthProvider>); });
  const expire = jest.mocked(onPullimSessionExpired).mock.calls.at(-1)![0];
  await act(async () => { expire(); oldSession.resolve(profile('A')); });

  expect(screen.getByTestId('identity')).toHaveTextContent('unauthenticated:-:-');
  expect(accountMe).not.toHaveBeenCalled();
});

it('clears the previous email while the replacement session is still pending', async () => {
  session.mockResolvedValueOnce(profile('A'))
    .mockReturnValueOnce(deferred<PullimMeProfile>().promise);
  accountMe.mockResolvedValueOnce(account('a@example.com'));
  await act(async () => { render(<AuthProvider><Probe /></AuthProvider>); });
  expect(screen.getByTestId('identity')).toHaveTextContent('a@example.com');

  await act(async () => { screen.getByText('retry').click(); });

  expect(screen.getByTestId('identity')).toHaveTextContent('loading:A:-');
});

it('treats only a successful null profile as onboarding', async () => {
  session.mockResolvedValueOnce(null);
  accountMe.mockResolvedValueOnce(account('new@example.com'));
  await act(async () => { render(<AuthProvider><Probe /></AuthProvider>); });
  expect(screen.getByTestId('identity')).toHaveTextContent('onboarding:-:new@example.com');
});

it.each([[401, 'unauthenticated'], [403, 'forbidden'], [404, 'error'], [500, 'error']])('keeps HTTP %s separate from onboarding', async (code, status) => {
  session.mockRejectedValueOnce(new ApiError({ code: 'planner', statusCode: Number(code), message: 'unavailable' }));
  accountMe.mockResolvedValueOnce(account('current@example.com'));
  await act(async () => { render(<AuthProvider><Probe /></AuthProvider>); });
  expect(screen.getByTestId('identity')).toHaveTextContent(`${status}:-:`);
  if (code !== 403) expect(accountMe).not.toHaveBeenCalled();
});

it('ignores an older null result after a newer profile resolves', async () => {
  const oldSession = deferred<PullimMeProfile | null>();
  session.mockReturnValueOnce(oldSession.promise).mockResolvedValueOnce(profile('B'));
  accountMe.mockResolvedValueOnce(account('b@example.com'));
  await act(async () => { render(<AuthProvider><Probe /></AuthProvider>); });
  await act(async () => { screen.getByText('retry').click(); });
  await act(async () => { oldSession.resolve(null); });
  expect(screen.getByTestId('identity')).toHaveTextContent('authenticated:B:b@example.com');
});


it.each(['CSRF_ORIGIN_REJECTED', 'CSRF_TOKEN_MISMATCH'])('does not treat refresh %s as missing entitlement or load account', async (code) => {
  session.mockRejectedValueOnce(new ApiError({ code, statusCode: 403, message: 'Forbidden' }));
  await act(async () => { render(<AuthProvider><Probe /></AuthProvider>); });
  expect(screen.getByTestId('identity')).toHaveTextContent('error:-:-');
  expect(accountMe).not.toHaveBeenCalled();
});


it.each(['CSRF_ORIGIN_REJECTED', 'CSRF_TOKEN_MISMATCH'])('real session refresh %s does not start account lookup', async (code) => {
  localStorage.clear();
  const calls: string[] = [];
  const fetchImpl = jest.fn(async (url: string) => {
    calls.push(url);
    const status = url.endsWith('/auth/csrf') ? 200 : url.endsWith('/auth/refresh') ? 403 : 401;
    const body = status === 200 ? { csrfToken: 'synthetic-csrf' } : { statusCode: status, code, message: 'CSRF: rejected' };
    return { ok: status === 200, status, text: async () => JSON.stringify(body) } as Response;
  }) as unknown as typeof fetch;
  const client = createPullimSessionClient({ baseUrl: 'https://api.test', fetchImpl });
  session.mockImplementation(client.session);
  accountMe.mockImplementation(client.accountMe);
  await act(async () => { render(<AuthProvider><Probe /></AuthProvider>); });
  expect(screen.getByTestId('identity')).toHaveTextContent('error:-:-');
  expect(accountMe).not.toHaveBeenCalled();
  expect(calls.filter((url) => url.endsWith('/auth/refresh'))).toHaveLength(code === 'CSRF_TOKEN_MISMATCH' ? 2 : 1);
  expect(calls.some((url) => url.endsWith('/me'))).toBe(false);
});

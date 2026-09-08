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

it.each([200, 403, 404])('discards account A response after a replacement session returns %s', async (code) => {
  const oldAccount = deferred<Awaited<ReturnType<typeof accountMe>>>();
  session.mockResolvedValueOnce(profile('A'));
  accountMe.mockReturnValueOnce(oldAccount.promise).mockResolvedValueOnce(account('b@example.com'));
  await act(async () => { render(<AuthProvider><Probe /></AuthProvider>); });
  if (code === 200) session.mockResolvedValueOnce(profile('B'));
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
  const oldSession = deferred<PullimMeProfile>();
  session.mockReturnValueOnce(oldSession.promise).mockResolvedValueOnce(profile('B'));
  accountMe.mockResolvedValue(account('b@example.com'));
  await act(async () => { render(<AuthProvider><Probe /></AuthProvider>); });
  await act(async () => { screen.getByText('retry').click(); });

  await act(async () => { oldSession.resolve(profile('A')); });

  expect(screen.getByTestId('identity')).toHaveTextContent('authenticated:B:b@example.com');
  expect(accountMe).toHaveBeenCalledTimes(1);
});

it('does not restore a pending session after a session-expired event', async () => {
  const oldSession = deferred<PullimMeProfile>();
  session.mockReturnValueOnce(oldSession.promise);
  await act(async () => { render(<AuthProvider><Probe /></AuthProvider>); });
  const expire = jest.mocked(onPullimSessionExpired).mock.calls.at(-1)![0];
  await act(async () => { expire(); oldSession.resolve(profile('A')); });

  expect(screen.getByTestId('identity')).toHaveTextContent('unauthenticated:-:-');
  expect(accountMe).not.toHaveBeenCalled();
});

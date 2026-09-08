import { act, render, screen, waitFor } from '@testing-library/react';
import { AuthProvider } from '@/lib/auth/auth-context';
import { ServiceSwitcher } from '@/components/shell/service-switcher';
import { onPullimSessionExpired, pullimSession } from '@/lib/auth/pullim-session-client';

jest.mock('@/lib/auth/pullim-session-client', () => ({
  pullimSession: {
    session: jest.fn(), accountMe: jest.fn(), entitlements: jest.fn(),
  },
  onPullimSessionExpired: jest.fn(() => () => {}),
}));

const profile = { id: 'student-1', name: '학생' };
const session = jest.mocked(pullimSession.session);
const accountMe = jest.mocked(pullimSession.accountMe);

beforeEach(() => {
  jest.clearAllMocks();
  session.mockResolvedValue(profile as Awaited<ReturnType<typeof session>>);
  jest.mocked(pullimSession.entitlements).mockResolvedValue({ flags: {} });
});

it.each(['staff@curea.co', 'Staff@CUREA.CO'])('shows Studio for %s after account verification', async (email) => {
  accountMe.mockResolvedValue({ email, name: '', displayName: '학생' });
  render(<AuthProvider><ServiceSwitcher /></AuthProvider>);
  await waitFor(() => expect(screen.getByText('스튜디오')).toBeInTheDocument());
});

it.each(['student@gmail.com', 'staff@sub.curea.co', 'staff@curea.co.example', '', 'bad@staff@curea.co'])('hides Studio for %s and preserves other services', async (email) => {
  accountMe.mockResolvedValue({ email, name: '학생', displayName: '학생' });
  await act(async () => { render(<AuthProvider><ServiceSwitcher /></AuthProvider>); });
  expect(screen.queryByText('스튜디오')).not.toBeInTheDocument();
  expect(screen.getByText('문제큐')).toBeInTheDocument();
});

it('hides Studio while account identity is loading and after lookup failure', async () => {
  let rejectAccount!: (reason: Error) => void;
  accountMe.mockReturnValue(new Promise((_resolve, reject) => { rejectAccount = reject; }));
  await act(async () => { render(<AuthProvider><ServiceSwitcher /></AuthProvider>); });
  expect(screen.queryByText('스튜디오')).not.toBeInTheDocument();
  await act(async () => { rejectAccount(new Error('offline')); });
  expect(screen.queryByText('스튜디오')).not.toBeInTheDocument();
});

it('does not show Studio when session restoration fails', async () => {
  session.mockRejectedValue(new Error('offline'));
  await act(async () => { render(<AuthProvider><ServiceSwitcher /></AuthProvider>); });
  expect(accountMe).not.toHaveBeenCalled();
  expect(screen.queryByText('스튜디오')).not.toBeInTheDocument();
});

it('ignores a delayed account response after session expiration', async () => {
  let resolveAccount!: (data: { email: string; name: string; displayName: string }) => void;
  accountMe.mockReturnValue(new Promise((resolve) => { resolveAccount = resolve; }));
  await act(async () => { render(<AuthProvider><ServiceSwitcher /></AuthProvider>); });
  const expire = jest.mocked(onPullimSessionExpired).mock.calls.at(-1)![0];
  await act(async () => { expire(); });
  await act(async () => { resolveAccount({ email: 'staff@curea.co', name: '직원', displayName: '직원' }); });
  expect(screen.queryByText('스튜디오')).not.toBeInTheDocument();
});

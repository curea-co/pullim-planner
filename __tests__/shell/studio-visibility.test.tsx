import { act, render, screen, waitFor } from '@testing-library/react';
import { ApiError } from '@/lib/api-client';
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


/**
 * **planner 권한·프로필이 없어도 로그인은 로그인이다** (Codex #257).
 *
 * `/planner/me` 는 세 가지를 서로 다르게 말한다:
 *   401 = 비로그인 · **403 = 로그인했으나 planner 엔타이틀먼트 없음** · **404 = 온보딩 전**
 *
 * 처음 구현은 계정 이메일을 200 분기에서만 조회했다. 그러면 planner 를 안 쓰는 curea 계정 —
 * 즉 **스튜디오만 쓰는 사람** — 에게서 스튜디오가 영구히 숨는다. 게이트를 만든 목적 자체가
 * 그 사용자에게 성립하지 않는다. 계정 식별은 planner 권한에 끌려가면 안 된다.
 */
describe('planner 권한 없이도 계정 게이트가 동작한다', () => {
  const err = (statusCode: number) =>
    new ApiError({ code: 'planner', statusCode, message: `planner ${statusCode}` });

  it.each([
    ['403 — planner 엔타이틀먼트 없음', 403],
    ['404 — 온보딩 전(학습 프로필 미생성)', 404],
  ])('%s 에서도 curea 계정이면 스튜디오가 보인다', async (_label, statusCode) => {
    session.mockRejectedValue(err(statusCode));
    accountMe.mockResolvedValue({ email: 'staff@curea.co', name: '', displayName: '직원' });

    render(<AuthProvider><ServiceSwitcher /></AuthProvider>);

    await waitFor(() => expect(screen.getByText('스튜디오')).toBeInTheDocument());
    expect(accountMe).toHaveBeenCalled();
  });

  it.each([403, 404])('%s 에서도 curea 계정이 아니면 숨는다', async (statusCode) => {
    session.mockRejectedValue(err(statusCode));
    accountMe.mockResolvedValue({ email: 'student@gmail.com', name: '학생', displayName: '학생' });

    await act(async () => { render(<AuthProvider><ServiceSwitcher /></AuthProvider>); });

    expect(screen.queryByText('스튜디오')).not.toBeInTheDocument();
    expect(screen.getByText('문제큐')).toBeInTheDocument();
  });

  it('401(비로그인)에서는 계정 조회를 아예 하지 않는다', async () => {
    session.mockRejectedValue(err(401));

    await act(async () => { render(<AuthProvider><ServiceSwitcher /></AuthProvider>); });

    expect(accountMe).not.toHaveBeenCalled();
    expect(screen.queryByText('스튜디오')).not.toBeInTheDocument();
  });
});

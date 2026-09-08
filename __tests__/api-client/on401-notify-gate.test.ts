/**
 * 전역 세션 만료 통지는 **만료가 확정된 401** 에서만 나간다.
 *
 * 통지 한 번의 대가가 앱 전체 이탈이다 — `auth-context` 가 상태를 내리고 `RequireAuth` 가
 * `window.location.assign` 으로 중앙 로그인으로 보낸다. 그런데 월간 뷰는 하루당 한 번씩
 * 수십 개를 동시에 쏘고 훅이 날짜별 실패를 삼키므로, 그중 하나의 일과성 401 이 화면은
 * 조용한 채 앱을 튕겨냈다. (QA 2026-09-04 N-02)
 *
 * 판정은 `cookie-http` 가 내려 `ApiError.sessionExpired` 로 싣는다. 이 파일은 래퍼가 그
 * 표시를 **실제로 따르는지**를 고정한다 — 표시가 붙는지는 session-expired-401 테스트가 본다.
 */
const mockNotify = jest.fn();
jest.mock('@/lib/auth/pullim-session-client', () => ({
  notifyPullimSessionExpired: () => mockNotify(),
  pullimSession: { refreshSession: jest.fn() },
}));

const mockBlocks = jest.fn();
jest.mock('@/lib/api-client', () => {
  const actual = jest.requireActual('@/lib/api-client');
  return {
    ...actual,
    // 래퍼만 관심사다 — 팩토리는 blocks 만 실제로 동작하는 스텁으로 대체한다.
    createPullimPlannerClient: () => ({ blocks: (...a: unknown[]) => mockBlocks(...a) }),
  };
});

import { ApiError } from '@/lib/api-client';
import { pullimPlannerClient } from '@/lib/planner/pullim-client';

const err = (sessionExpired: boolean) =>
  new ApiError({
    code: 'COMMON_UNAUTHORIZED',
    message: '인증에 실패했습니다.',
    statusCode: 401,
    sessionExpired,
  });

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => jest.restoreAllMocks());

describe('on401 통지 게이트', () => {
  it('만료 확정 401 → 전역 통지', async () => {
    mockBlocks.mockRejectedValue(err(true));
    await expect(pullimPlannerClient.blocks('p1', '2026-09-07')).rejects.toBeInstanceOf(ApiError);
    expect(mockNotify).toHaveBeenCalledTimes(1);
  });

  it('만료 아닌 401 → 통지하지 않는다. 그 요청만 실패한다', async () => {
    mockBlocks.mockRejectedValue(err(false));
    await expect(pullimPlannerClient.blocks('p1', '2026-09-07')).rejects.toBeInstanceOf(ApiError);
    expect(mockNotify).not.toHaveBeenCalled();
    // 화면에 안 남는 경로라 콘솔에는 남긴다
    expect(console.error).toHaveBeenCalled();
  });

  it('401 이 아닌 실패는 건드리지 않는다', async () => {
    mockBlocks.mockRejectedValue(
      new ApiError({ code: 'COMMON_SERVER_ERROR', message: '서버 오류', statusCode: 500 }),
    );
    await expect(pullimPlannerClient.blocks('p1', '2026-09-07')).rejects.toBeInstanceOf(ApiError);
    expect(mockNotify).not.toHaveBeenCalled();
  });
});

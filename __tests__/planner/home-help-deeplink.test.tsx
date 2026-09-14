/**
 * `/planner?help=1` 은 원래 홈의 웰컴 모달을 여는 도움말 딥링크였다. 모달을 제거하면서
 * 이 파라미터가 아무 동작도 하지 않으면 북마크·외부 링크로 들어온 사용자가 매뉴얼에
 * 닿지 못한다(Codex #268). 가이드 권위인 온보딩 랜딩으로 넘기는 배선을 고정한다.
 *
 * 다른 라우트로 가는 이동이라 수단은 **router** 다 — History API 는 URL 만 바꿔 화면이
 * 홈에 남는다(`lib/planner/query-nav` § 쓰는 자리).
 */
import { render, act } from '@testing-library/react';

const mockPush = jest.fn();
const mockReplace = jest.fn();
let searchParams = new URLSearchParams('');
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace, prefetch: jest.fn(), back: jest.fn() }),
  usePathname: () => '/planner',
  useSearchParams: () => searchParams,
}));

jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() },
}));

const mockPushQuery = jest.fn();
const mockReplaceQuery = jest.fn();
jest.mock('@/lib/planner/query-nav', () => ({
  pushQuery: (...a: unknown[]) => mockPushQuery(...a),
  replaceQuery: (...a: unknown[]) => mockReplaceQuery(...a),
}));

// 배선만 보므로 **비어 있지만 계약에 맞는** 응답을 준다 — null 로 뭉개면 컨테이너가
// 필드를 읽다 던지고 .catch 가 삼켜 실패 경로만 타게 된다(Codex #247).
jest.mock('@/lib/planner/pullim-client', () => ({
  pullimPlannerClient: {
    list: () => Promise.resolve([]),
    blocksRange: () => Promise.resolve([]),
    burnout: () => Promise.resolve({ available: false }),
    condition: () => Promise.resolve({ date: '2026-09-14', level: null }),
    saveCondition: () => Promise.resolve({ date: '2026-09-14', level: 3 }),
    completeBlock: () => Promise.resolve(undefined),
  },
  pullimToPlanner: (p: unknown) => p,
}));

jest.mock('@/components/features/planner-home/presenters/HomePresenter', () => ({
  __esModule: true,
  default: () => <div data-testid="home-presenter" />,
}));

import HomeContainer from '@/components/features/planner-home/containers/HomeContainer';

beforeEach(() => {
  jest.clearAllMocks();
  searchParams = new URLSearchParams('');
});

describe('?help=1 도움말 딥링크', () => {
  it('온보딩 랜딩으로 넘긴다 — 모달이 사라져도 매뉴얼 진입점은 살아 있어야 한다', async () => {
    searchParams = new URLSearchParams('help=1');
    await act(async () => { render(<HomeContainer />); });
    expect(mockReplace).toHaveBeenCalledWith('/planner/onboarding');
  });

  it('help 가 없으면 홈에 그대로 머문다 — 일반 진입을 가로채지 않는다', async () => {
    searchParams = new URLSearchParams('view=week');
    await act(async () => { render(<HomeContainer />); });
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});

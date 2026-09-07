/**
 * KST 날짜 타이머는 **한 화면에 하나**다.
 *
 * `useKstToday` 를 컨테이너와 `useHomeBlocks` 가 각각 부르면 훅 인스턴스마다 `useEffect` 가
 * 따로 돌아 **타이머가 두 개** 생긴다. 「공유」가 아니라 각자 도는 것이고, 자정 부근에 컨디션
 * 날짜와 블록 기준일이 **서로 다른 렌더에** 갱신된다(Codex #251).
 *
 * 컨테이너는 훅을 다시 부르지 않고 `useHomeBlocks` 의 반환값(`todayIso`)을 쓴다.
 */
import { render, act } from '@testing-library/react';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), prefetch: jest.fn(), back: jest.fn() }),
  usePathname: () => '/planner',
  useSearchParams: () => new URLSearchParams(''),
}));
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() } }));
jest.mock('@vercel/analytics', () => ({ track: jest.fn() }));
jest.mock('@/lib/planner/query-nav', () => ({ pushQuery: jest.fn(), replaceQuery: jest.fn() }));
jest.mock('@/lib/planner/pullim-client', () => ({
  pullimPlannerClient: {
    list: () => Promise.resolve([{ id: 'p1', active: true, examStartDate: '2026-11-13', examLabel: '수능' }]),
    blocksRange: () => Promise.resolve([]),
    burnout: () => Promise.resolve({ available: false }),
    condition: () => Promise.resolve({ date: '2026-09-07', level: null }),
    saveCondition: () => Promise.resolve({ date: '2026-09-07', level: 3 }),
    completeBlock: () => Promise.resolve(undefined),
  },
  pullimToPlanner: (p: unknown) => p,
}));
// 프리젠터는 배선만 보므로 비운다 — day-view 의 자체 시계 타이머가 셈에 섞이지 않게.
jest.mock('@/components/features/planner-home/presenters/HomePresenter', () => ({
  __esModule: true,
  default: () => null,
}));

import HomeContainer from '@/components/features/planner-home/containers/HomeContainer';

describe('KST 날짜 타이머', () => {
  it('홈 한 화면에 60초 인터벌이 하나만 생긴다', async () => {
    const spy = jest.spyOn(globalThis, 'setInterval');
    await act(async () => { render(<HomeContainer />); });

    const minuteTimers = spy.mock.calls.filter(([, delay]) => delay === 60_000);
    expect(minuteTimers).toHaveLength(1);
    spy.mockRestore();
  });
});

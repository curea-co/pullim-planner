/**
 * 자정을 넘기면 홈이 **새 날짜로 다시 읽는다.**
 *
 * `useHomeBlocks` 는 「오늘」을 마운트 시점에 한 번 계산해 썼다(`useMemo(…, [])`). 밤에 열어
 * 둔 탭은 자정을 넘겨도 어제 날짜로 계속 조회하고 계산한다 — 헤더 제목, 주간·월간 창,
 * 히어로의 「오늘/이번 주」가 전부 어제 기준이고 새 날짜 블록은 조회조차 되지 않는다.
 *
 * `HomeContainer` 는 컨디션 때문에 이미 같은 틱을 갖고 있었고 그 주석에 이 문제가 적혀
 * 있었다 — 「마운트 1회 계산이던 useHomeBlocks.todayIso 로는 effect 가 재실행되지 않음」.
 * 알려진 채로 남아 있던 자리다.
 */
import { act, renderHook, waitFor } from '@testing-library/react';

const mockList = jest.fn();
const mockBlocksRange = jest.fn();
jest.mock('@/lib/planner/pullim-client', () => ({
  pullimPlannerClient: {
    list: (...a: unknown[]) => mockList(...a),
    blocks: jest.fn(),
    blocksRange: (...a: unknown[]) => mockBlocksRange(...a),
  },
  pullimToPlanner: (p: unknown) => p,
}));

import { useHomeBlocks } from '@/components/features/planner-home/hooks/use-home-blocks';
import { useKstToday } from '@/components/features/planner-home/hooks/use-kst-today';

/** KST 23:59 → 그 1분 뒤는 다음 날 00:00. */
const BEFORE_MIDNIGHT = Date.parse('2026-09-07T14:59:30Z');

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(BEFORE_MIDNIGHT);
  mockList.mockResolvedValue([{ id: 'p1', active: true }]);
  mockBlocksRange.mockResolvedValue([]);
});
afterEach(() => jest.useRealTimers());

describe('useKstToday', () => {
  it('자정을 넘기면 값이 바뀐다', async () => {
    const { result } = renderHook(() => useKstToday());
    expect(result.current).toBe('2026-09-07');

    await act(async () => { jest.advanceTimersByTime(60_000); });
    expect(result.current).toBe('2026-09-08');
  });

  it('같은 날 안에서는 같은 문자열을 유지한다 — 1분마다 재조회하지 않기 위해', async () => {
    jest.setSystemTime(Date.parse('2026-09-07T02:00:00Z'));
    const { result } = renderHook(() => useKstToday());
    const first = result.current;

    await act(async () => { jest.advanceTimersByTime(60_000 * 5); });
    expect(result.current).toBe(first); // 참조까지 동일 — deps 가 흔들리지 않는다
  });
});

describe('useHomeBlocks — 자정 전환', () => {
  it('날짜가 바뀌면 새 창으로 다시 조회한다', async () => {
    renderHook(() => useHomeBlocks(true, 'day', 0));
    await waitFor(() => expect(mockBlocksRange).toHaveBeenCalled());
    await act(async () => { await Promise.resolve(); });

    const before = mockBlocksRange.mock.calls.map((c) => c[1] as string);
    expect(before).toContain('2026-09-07'); // 일간 창 = 오늘

    mockBlocksRange.mockClear();
    await act(async () => { jest.advanceTimersByTime(60_000); });

    await waitFor(() => expect(mockBlocksRange).toHaveBeenCalled());
    const after = mockBlocksRange.mock.calls.map((c) => c[1] as string);
    expect(after).toContain('2026-09-08'); // 새 날짜로 다시 읽는다
  });

  it('todayIso 가 새 날짜를 가리킨다 — 파생 계산의 공통 기준', async () => {
    const { result } = renderHook(() => useHomeBlocks(true, 'day', 0));
    await waitFor(() => expect(result.current.todayIso).toBe('2026-09-07'));

    await act(async () => { jest.advanceTimersByTime(60_000); });
    expect(result.current.todayIso).toBe('2026-09-08');
  });
});

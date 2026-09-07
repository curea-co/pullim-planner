/**
 * 홈 블록 조회가 **기간 1회**로 나간다 — 하루씩 N 번 쏘던 뭉치를 없앤다.
 *
 * 월간 뷰는 한 화면에서 하루당 1회씩 31회 + 히어로 7회 = **37개를 동시에** 보냈다. 그 뭉치가
 * access 토큰 만료와 겹치면 수십 개가 한꺼번에 401 을 받는다(dev 실측: 9ms 안 15건). 뭉치를
 * 없애는 것이 근본 수정이고, BE 기간 조회(pullim-api #630)가 그 전제다.
 *
 * 여기서 고정하는 것 둘 — **요청 수**와 **결과 형태**다. 형태가 달라지면(빈 날의 키가 사라지면)
 * 뷰들이 "계획 없음"을 다르게 판단한다.
 */
import { renderHook, waitFor } from '@testing-library/react';

const mockList = jest.fn();
const mockBlocks = jest.fn();
const mockBlocksRange = jest.fn();
jest.mock('@/lib/planner/pullim-client', () => ({
  pullimPlannerClient: {
    list: (...a: unknown[]) => mockList(...a),
    blocks: (...a: unknown[]) => mockBlocks(...a),
    blocksRange: (...a: unknown[]) => mockBlocksRange(...a),
  },
  pullimToPlanner: (p: unknown) => p,
}));

import { useHomeBlocks } from '@/components/features/planner-home/hooks/use-home-blocks';

const PLANNER = { id: 'p1', active: true };

/** BE 응답 한 건 — 기간 응답은 각 항목이 date 를 싣는다(#630). */
const block = (id: string, date: string) => ({
  id,
  date,
  start: '18:00',
  end: '18:50',
  subject: 'english',
  type: 'concept',
  title: 't',
  engines: [],
  progress: 0,
  status: 'todo',
  expectedMinutes: 50,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockList.mockResolvedValue([PLANNER]);
  mockBlocksRange.mockResolvedValue([]);
});

describe('홈 블록 조회', () => {
  it('월간 뷰에서 기간 요청 2회만 나간다 — 종전 37회', async () => {
    renderHook(() => useHomeBlocks(true, 'month', 0));

    await waitFor(() => expect(mockBlocksRange).toHaveBeenCalled());
    // 기간(월) 1 + 히어로(이번 주) 1 = 2. 하루씩 부르는 경로는 아예 안 쓴다.
    await waitFor(() => expect(mockBlocksRange).toHaveBeenCalledTimes(2));
    expect(mockBlocks).not.toHaveBeenCalled();
  });

  it('요청 창이 그 기간의 첫날~마지막날이다', async () => {
    renderHook(() => useHomeBlocks(true, 'month', 0));

    await waitFor(() => expect(mockBlocksRange).toHaveBeenCalledTimes(2));
    for (const call of mockBlocksRange.mock.calls) {
      const [plannerId, from, to] = call as [string, string, string];
      expect(plannerId).toBe('p1');
      expect(from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(to).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(from <= to).toBe(true);
    }
  });

  it('블록 없는 날도 빈 배열 키를 갖는다 — 뷰가 키 존재로 "계획 없음"을 판단한다', async () => {
    const { result } = renderHook(() => useHomeBlocks(true, 'week', 0));

    await waitFor(() => expect(mockBlocksRange).toHaveBeenCalled());
    await waitFor(() =>
      expect(Object.keys(result.current.blocksByDate).length).toBe(7),
    );
    expect(
      Object.values(result.current.blocksByDate).every((v) => Array.isArray(v)),
    ).toBe(true);
  });

  it('응답을 날짜별로 묶는다', async () => {
    const { result } = renderHook(() => useHomeBlocks(true, 'week', 0));
    await waitFor(() => expect(mockBlocksRange).toHaveBeenCalled());
    const [, from] = mockBlocksRange.mock.calls[0] as [string, string, string];

    mockBlocksRange.mockResolvedValue([block('b1', from), block('b2', from)]);
    const { result: r2 } = renderHook(() => useHomeBlocks(true, 'week', 0));

    await waitFor(() => expect(r2.current.blocksByDate[from]?.length).toBe(2));
    expect(r2.current.blocksByDate[from].map((b) => b.id)).toEqual(['b1', 'b2']);
  });

  it('기간 조회가 실패해도 키 형태는 유지된다 — 화면이 흔들리지 않게', async () => {
    mockBlocksRange.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useHomeBlocks(true, 'week', 0));

    await waitFor(() =>
      expect(Object.keys(result.current.blocksByDate).length).toBe(7),
    );
  });
});

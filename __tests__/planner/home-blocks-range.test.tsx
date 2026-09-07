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
import { act, renderHook, waitFor } from '@testing-library/react';

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
    renderHook(() => useHomeBlocks(true, 'week', 0));
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

/**
 * 실패를 실패라고 말한다.
 *
 * 기간 조회는 전부 아니면 전무라, 실패하면 창이 통째로 빈다. 형태만 유지하고 끝내면 그 화면은
 * "이 기간엔 계획이 없다"와 **픽셀 단위로 같다** — 사용자는 시간표가 지워졌다고 읽는다.
 */
describe('조회 실패가 "계획 없음"으로 위장되지 않는다', () => {
  let spy: jest.SpyInstance;
  beforeEach(() => {
    spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => spy.mockRestore());

  it('기간 조회 실패는 blocksError 로 선다 — 빈 기간과 구분된다', async () => {
    mockBlocksRange.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useHomeBlocks(true, 'week', 0));

    await waitFor(() => expect(result.current.blocksError).toBe(true));
    expect(result.current.heroBlocksError).toBe(true);
  });

  it('성공하면 blocksError 는 서지 않는다', async () => {
    const { result } = renderHook(() => useHomeBlocks(true, 'week', 0));

    await waitFor(() => expect(mockBlocksRange).toHaveBeenCalled());
    await waitFor(() => expect(Object.keys(result.current.blocksByDate).length).toBe(7));
    expect(result.current.blocksError).toBe(false);
  });

  it('목록 조회 실패는 status=error 이고, 콘솔에 원인이 남는다', async () => {
    mockList.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useHomeBlocks(true, 'week', 0));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(spy).toHaveBeenCalled();
  });

  it('retry() 는 목록까지 다시 읽는다 — 실패 화면의 [다시 시도]', async () => {
    mockList.mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useHomeBlocks(true, 'week', 0));
    await waitFor(() => expect(result.current.status).toBe('error'));

    mockList.mockResolvedValue([PLANNER]);
    act(() => result.current.retry());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(mockList).toHaveBeenCalledTimes(2);
  });

  it('재시도 중에는 실패 상태를 유지한다 — 응답 전에 화면을 치우면 위장이 재현된다', async () => {
    mockBlocksRange.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useHomeBlocks(true, 'week', 0));
    await waitFor(() => expect(result.current.blocksError).toBe(true));

    // 응답을 붙잡아 둔 채로 재시도 — 클릭 직후 상태를 본다.
    let release: (v: unknown[]) => void = () => {};
    mockBlocksRange.mockReturnValue(new Promise((res) => { release = res; }));
    act(() => result.current.retry());

    expect(result.current.blocksError).toBe(true);   // 실패 화면이 남아 있다
    await waitFor(() => expect(result.current.retrying).toBe(false)); // 목록은 먼저 끝난다
    expect(result.current.blocksError).toBe(true);   // 블록 응답 전이므로 여전히 실패

    await act(async () => { release([]); });
    await waitFor(() => expect(result.current.blocksError).toBe(false)); // 성공 콜백에서만 내린다
  });

  it('활성 시간표가 없어지면 실패 플래그도 함께 내려간다 — 진짜 빈 상태를 실패로 그리지 않게', async () => {
    // 실패 상태를 만든 뒤, 재시도 사이에 시간표가 비활성화·삭제된 상황.
    mockBlocksRange.mockRejectedValue(new Error('network'));
    const { result } = renderHook(() => useHomeBlocks(true, 'week', 0));
    await waitFor(() => expect(result.current.blocksError).toBe(true));

    mockList.mockResolvedValue([{ id: 'p1', active: false }]);
    act(() => result.current.retry());

    await waitFor(() => expect(result.current.active).toBeNull());
    // 블록 effect 는 activeRaw=null 에서 조기 반환한다 — 플래그를 내릴 기회가 없으므로
    // 파생으로 막는다. 남은 블록도 함께 비워야 남의 시간표 블록이 보이지 않는다.
    expect(result.current.blocksError).toBe(false);
    expect(result.current.heroBlocksError).toBe(false);
    expect(Object.keys(result.current.blocksByDate)).toEqual([]);
    expect(Object.keys(result.current.heroBlocksByDate)).toEqual([]);
  });

  it('refetch() 는 목록을 다시 읽지 않는다 — 쓰기 1회당 요청이 늘지 않게', async () => {
    const { result } = renderHook(() => useHomeBlocks(true, 'week', 0));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(mockList).toHaveBeenCalledTimes(1);

    act(() => result.current.refetch());

    await waitFor(() => expect(mockBlocksRange).toHaveBeenCalledTimes(4));
    expect(mockList).toHaveBeenCalledTimes(1);
  });
});

/**
 * 키를 **응답에서** 읽는다는 것이 #245 가 새로 연 실패면이다. 하루씩 부르던 시절의 키는 요청
 * 파라미터라 응답 모양과 무관했다. 지금은 `date` 가 계약에서 어긋나면 전부 조용히 사라진다 —
 * pullim-api #629 가 정확히 그 회귀(`date` 가 Date 객체로 나오던 것)였다.
 */
describe('응답 date 가 계약에서 어긋나도 조용히 사라지지 않는다', () => {
  let spy: jest.SpyInstance;
  beforeEach(() => {
    spy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => spy.mockRestore());

  it('ISO datetime 으로 와도 그 날짜에 꽂힌다', async () => {
    renderHook(() => useHomeBlocks(true, 'week', 0));
    await waitFor(() => expect(mockBlocksRange).toHaveBeenCalled());
    const [, from] = mockBlocksRange.mock.calls[0] as [string, string, string];

    mockBlocksRange.mockResolvedValue([block('b1', `${from}T00:00:00.000Z`)]);
    const { result: r2 } = renderHook(() => useHomeBlocks(true, 'week', 0));

    await waitFor(() => expect(r2.current.blocksByDate[from]?.length).toBe(1));
  });

  it('창 밖 날짜는 버리되 콘솔에 건수를 남긴다 — 소리 없이 사라지지 않게', async () => {
    mockBlocksRange.mockResolvedValue([block('b1', '1999-01-01')]);
    renderHook(() => useHomeBlocks(true, 'week', 0));

    await waitFor(() => expect(spy).toHaveBeenCalled());
    const msg = spy.mock.calls.map((c) => String(c[0])).join('\n');
    expect(msg).toContain('1/1건 버림');
  });
});

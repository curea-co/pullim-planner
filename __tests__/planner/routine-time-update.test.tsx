import { renderHook, act } from '@testing-library/react';
import type { PullimRoutine, PullimRoutinePatch } from '@/lib/api-client';
import type { Routine } from '@/lib/mock';

const mockUpdateRoutine = jest.fn<Promise<PullimRoutine>, [string, PullimRoutinePatch]>();

// 매퍼(`toRoutineTimePatch`)는 실제 구현을 그대로 쓰고 네트워크 호출만 가로챈다.
jest.mock('@/lib/planner/pullim-client', () => {
  const actual = jest.requireActual('@/lib/planner/pullim-client');
  return {
    ...actual,
    pullimPlannerClient: {
      ...actual.pullimPlannerClient,
      updateRoutine: (routineId: string, patch: PullimRoutinePatch) =>
        mockUpdateRoutine(routineId, patch),
    },
  };
});

type UseRoutineTimeUpdate =
  typeof import('@/components/features/planner-manage/hooks/use-routine-time-update')['useRoutineTimeUpdate'];

let useRoutineTimeUpdate: UseRoutineTimeUpdate;

const routine: Routine = {
  id: 'r1',
  title: '아침 수학',
  subject: 'math',
  type: 'concept',
  startTime: '07:00',
  endTime: '08:00',
  weekdays: [0, 1, 2, 3, 4],
};

const savedRoutine: PullimRoutine = {
  id: 'r1',
  title: '아침 수학',
  subject: 'math',
  type: 'concept',
  startTime: '19:00:00',
  endTime: '20:00:00',
  expectedMinutes: 60,
  weekdayMask: 0b0011111,
  engines: [],
  enabled: true,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

describe('useRoutineTimeUpdate — 시각만 바꾸는 부분 수정', () => {
  beforeAll(() => {
    // dev 우회(mock store) 경로가 아니라 pullim-api 경로를 타게 한다.
    process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS = '0';
    ({ useRoutineTimeUpdate } = jest.requireActual(
      '@/components/features/planner-manage/hooks/use-routine-time-update',
    ));
  });

  beforeEach(() => {
    mockUpdateRoutine.mockReset();
    mockUpdateRoutine.mockResolvedValue(savedRoutine);
  });

  it('바뀐 시각과 파생 expectedMinutes 만 보낸다 — 제목/과목/유형/요일은 본문에 없다', async () => {
    const setRoutines = jest.fn();
    const { result } = renderHook(() => useRoutineTimeUpdate([routine], setRoutines));

    await act(async () => {
      await result.current('r1', { startTime: '19:00', endTime: '20:00' });
    });

    expect(mockUpdateRoutine).toHaveBeenCalledTimes(1);
    const [routineId, body] = mockUpdateRoutine.mock.calls[0];
    expect(routineId).toBe('r1');
    expect(body).toEqual({ startTime: '19:00', endTime: '20:00', expectedMinutes: 60 });
    expect(Object.keys(body).sort()).toEqual(['endTime', 'expectedMinutes', 'startTime']);
    expect(body).not.toHaveProperty('title');
    expect(body).not.toHaveProperty('subject');
    expect(body).not.toHaveProperty('type');
    expect(body).not.toHaveProperty('weekdayMask');
  });

  it('서버 응답으로 해당 루틴을 교체한다', async () => {
    const setRoutines = jest.fn();
    const other: Routine = { ...routine, id: 'r2', title: '저녁 영어' };
    const { result } = renderHook(() => useRoutineTimeUpdate([routine, other], setRoutines));

    await act(async () => {
      await result.current('r1', { startTime: '19:00', endTime: '20:00' });
    });

    expect(setRoutines).toHaveBeenCalledTimes(1);
    const next = setRoutines.mock.calls[0][0] as Routine[];
    expect(next).toHaveLength(2);
    // 서버가 'HH:MM:SS' 를 줘도 뷰 계약대로 'HH:MM' 이 상태에 들어간다.
    expect(next[0]).toMatchObject({ id: 'r1', startTime: '19:00', endTime: '20:00' });
    expect(next[1]).toBe(other);
  });

  it('목록에 없는 루틴이면 호출하지 않고 던진다', async () => {
    const setRoutines = jest.fn();
    const { result } = renderHook(() => useRoutineTimeUpdate([routine], setRoutines));

    await expect(result.current('nope', { startTime: '19:00', endTime: '20:00' })).rejects.toThrow(
      '루틴을 찾지 못했어요',
    );
    expect(mockUpdateRoutine).not.toHaveBeenCalled();
    expect(setRoutines).not.toHaveBeenCalled();
  });
});

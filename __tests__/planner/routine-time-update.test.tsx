import { useState } from 'react';
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
    // 함수형 업데이트라 updater 를 현재 목록에 적용해 결과를 본다.
    const updater = setRoutines.mock.calls[0][0] as (list: Routine[]) => Routine[];
    const next = updater([routine, other]);
    expect(next).toHaveLength(2);
    // 서버가 'HH:MM:SS' 를 줘도 뷰 계약대로 'HH:MM' 이 상태에 들어간다.
    expect(next[0]).toMatchObject({ id: 'r1', startTime: '19:00', endTime: '20:00' });
    expect(next[1]).toBe(other);
  });

  it('PATCH 응답을 기다리는 사이 들어온 루틴 변경을 덮어쓰지 않는다', async () => {
    let resolvePatch: (saved: PullimRoutine) => void = () => {};
    mockUpdateRoutine.mockReturnValue(
      new Promise<PullimRoutine>(resolve => {
        resolvePatch = resolve;
      }),
    );
    const added: Routine = { ...routine, id: 'r3', title: '왕복 중 추가된 루틴' };

    // 실제 `useState` 를 물려 함수형 업데이트가 최신 상태 기준으로 도는지 본다.
    const { result } = renderHook(() => {
      const [routines, setRoutines] = useState<Routine[]>([routine]);
      return { routines, setRoutines, update: useRoutineTimeUpdate(routines, setRoutines) };
    });

    const pending = result.current.update('r1', { startTime: '19:00', endTime: '20:00' });
    // 응답 전에 다른 루틴이 추가된다.
    act(() => {
      result.current.setRoutines(prev => [...prev, added]);
    });
    await act(async () => {
      resolvePatch(savedRoutine);
      await pending;
    });

    expect(result.current.routines).toHaveLength(2);
    expect(result.current.routines[0]).toMatchObject({
      id: 'r1',
      startTime: '19:00',
      endTime: '20:00',
    });
    expect(result.current.routines[1]).toBe(added);
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

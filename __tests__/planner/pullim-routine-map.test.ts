import type { PullimRoutine } from '@/lib/api-client';
import { pullimToRoutine } from '@/lib/planner/pullim-client';

function serverRoutine(over: Partial<PullimRoutine> = {}): PullimRoutine {
  return {
    id: 'r1',
    title: '아침 수학',
    subject: 'math',
    type: 'concept',
    startTime: '19:00',
    endTime: '20:00',
    expectedMinutes: 60,
    weekdayMask: 0b0011111,
    engines: [],
    enabled: true,
    createdAt: '2026-08-01T00:00:00.000Z',
    updatedAt: '2026-08-01T00:00:00.000Z',
    ...over,
  };
}

describe('pullimToRoutine (pullim-api 루틴 → 뷰 Routine)', () => {
  it("DB time 이 'HH:MM:SS' 로 새어나와도 뷰 계약인 'HH:MM' 으로 자른다", () => {
    const routine = pullimToRoutine(
      serverRoutine({ startTime: '19:00:00', endTime: '20:30:00' }),
    );

    expect(routine.startTime).toBe('19:00');
    expect(routine.endTime).toBe('20:30');
  });

  it("이미 'HH:MM' 이면 그대로 두고 요일 비트마스크는 배열(0=월…6=일)로 편다", () => {
    const routine = pullimToRoutine(serverRoutine());

    expect(routine.startTime).toBe('19:00');
    expect(routine.endTime).toBe('20:00');
    expect(routine.weekdays).toEqual([0, 1, 2, 3, 4]);
  });
});

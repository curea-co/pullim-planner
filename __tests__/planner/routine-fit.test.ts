import { initialPlannerForm } from '@/components/features/planner-builder/components/builder-types';
import type { PlannerForm } from '@/components/features/planner-builder/components/builder-types';
import {
  diagnoseRoutineFit, subtractRanges, placeRoutinesForDay, busyRanges,
  suggestMoveIn, widenWindows,
} from '@/lib/planner/routine-fit';
import type { Routine } from '@/lib/mock';

const routine = (over: Partial<Routine> & Pick<Routine, 'id'>): Routine => ({
  title: '루틴', subject: 'math', type: 'concept',
  startTime: '19:00', endTime: '19:50', weekdays: [0, 1, 2, 3, 4],
  ...over,
});

const formWith = (over: Partial<PlannerForm>): PlannerForm => ({ ...initialPlannerForm, ...over });

describe('subtractRanges', () => {
  it('점유 구간을 뺀 나머지를 돌려준다', () => {
    expect(subtractRanges([600, 1320], [[720, 780]])).toEqual([[600, 720], [780, 1320]]);
  });

  it('겹치는 점유는 병합해서 뺀다', () => {
    expect(subtractRanges([600, 1320], [[700, 800], [750, 900]])).toEqual([[600, 700], [900, 1320]]);
  });

  it('창을 통째로 덮으면 빈 배열', () => {
    expect(subtractRanges([600, 700], [[500, 800]])).toEqual([]);
  });
});

describe('placeRoutinesForDay — 보류 사유 3종', () => {
  const win = [18 * 60, 23 * 60] as const;

  it('창을 완전히 벗어나면 가용 시간 밖', () => {
    const [placed] = placeRoutinesForDay([routine({ id: 'r1', startTime: '07:30', endTime: '08:00' })], 0, win[0], win[1]);
    expect(placed.held).toBe('가용 시간 밖');
  });

  it('한쪽 끝만 물리면 가용 시간 걸침', () => {
    const [placed] = placeRoutinesForDay([routine({ id: 'r1', startTime: '17:30', endTime: '18:30' })], 0, win[0], win[1]);
    expect(placed.held).toBe('가용 시간 걸침');
  });

  it('창 안에 온전히 들어가면 보류 없음', () => {
    const [placed] = placeRoutinesForDay([routine({ id: 'r1' })], 0, win[0], win[1]);
    expect(placed.held).toBeUndefined();
  });

  it('요일이 다르면 배치하지 않는다', () => {
    expect(placeRoutinesForDay([routine({ id: 'r1', weekdays: [6] })], 0, win[0], win[1])).toEqual([]);
  });

  it('앞선 루틴과 겹치면 루틴 겹침', () => {
    const placed = placeRoutinesForDay(
      [routine({ id: 'r1', startTime: '19:00', endTime: '20:00' }), routine({ id: 'r2', startTime: '19:30', endTime: '20:30' })],
      0, win[0], win[1],
    );
    expect(placed.map(p => p.held)).toEqual([undefined, '루틴 겹침']);
  });
});

describe('busyRanges — 더블부킹 방지', () => {
  it('창을 걸친 루틴도 점유로 센다', () => {
    // 창 밖으로 밀렸다고 점유에서 빼면 그 위에 생성 블록이 얹힌다(더블부킹).
    const placed = placeRoutinesForDay(
      [routine({ id: 'r1', startTime: '17:30', endTime: '18:30' })], 0, 18 * 60, 23 * 60,
    );
    expect(busyRanges(placed)).toEqual([[17 * 60 + 30, 18 * 60 + 30]]);
  });

  it('루틴 겹침으로 밀려난 것만 점유에서 뺀다', () => {
    const placed = placeRoutinesForDay(
      [routine({ id: 'r1', startTime: '19:00', endTime: '20:00' }), routine({ id: 'r2', startTime: '19:30', endTime: '20:30' })],
      0, 18 * 60, 23 * 60,
    );
    expect(busyRanges(placed)).toEqual([[19 * 60, 20 * 60]]);
  });
});

describe('diagnoseRoutineFit', () => {
  const morning = routine({ id: 'r1', title: '아침 영단어', startTime: '07:30', endTime: '08:00', weekdays: [0, 1, 2, 3, 4, 5] });

  it('선택하지 않은 루틴은 진단하지 않는다', () => {
    expect(diagnoseRoutineFit(formWith({ routineIds: [] }), [morning])).toEqual([]);
  });

  it('평일·주말 양쪽에 걸리면 창별로 한 건씩 준다', () => {
    // 기본 창: 평일 18–23, 주말 10–22 — 07:30 루틴은 양쪽 다 밖이다.
    const issues = diagnoseRoutineFit(formWith({ routineIds: ['r1'] }), [morning]);
    expect(issues).toHaveLength(2);
    expect(issues.map(i => i.windowKey)).toEqual(['weekdayHours', 'weekendHours']);
    expect(issues.every(i => i.held === '가용 시간 밖')).toBe(true);
    expect(issues[0].windowLabel).toBe('18:00–23:00');
  });

  it('같은 창의 여러 요일은 한 건으로 접는다', () => {
    // 월~금 다섯 번 걸려도 학생이 취할 조치는 하나다.
    const issues = diagnoseRoutineFit(formWith({ routineIds: ['r1'] }), [routine({ id: 'r1', startTime: '07:30', endTime: '08:00' })]);
    expect(issues).toHaveLength(1);
  });

  it('창 안에 들어가는 루틴은 진단에 남지 않는다', () => {
    expect(diagnoseRoutineFit(formWith({ routineIds: ['r1'] }), [routine({ id: 'r1' })])).toEqual([]);
  });

  it('창을 담으려면 필요한 시각을 시 단위로 알려준다', () => {
    const [issue] = diagnoseRoutineFit(formWith({ routineIds: ['r1'] }), [routine({ id: 'r1', startTime: '16:30', endTime: '17:20' })]);
    expect(issue.needStartHour).toBe(16);
    expect(issue.needEndHour).toBe(18); // 17:20 을 담으려면 18시까지
  });
});

describe('widenWindows', () => {
  it('걸린 창을 루틴이 들어갈 만큼만 넓힌다', () => {
    const form = formWith({ routineIds: ['r1'] });
    const target = routine({ id: 'r1', startTime: '16:30', endTime: '17:20' });
    const next = widenWindows(form, diagnoseRoutineFit(form, [target]), 'r1');
    expect(next.weekdayHours).toEqual({ start: 16, end: 23 });
    expect(next.weekendHours).toEqual(form.weekendHours); // 평일만 걸렸으면 주말은 그대로
  });

  it('평일·주말 양쪽에 걸리면 양쪽을 넓힌다', () => {
    const form = formWith({ routineIds: ['r1'] });
    const target = routine({ id: 'r1', startTime: '07:30', endTime: '08:00', weekdays: [0, 1, 2, 3, 4, 5] });
    const next = widenWindows(form, diagnoseRoutineFit(form, [target]), 'r1');
    expect(next.weekdayHours.start).toBe(7);
    expect(next.weekendHours.start).toBe(7);
  });

  it('루틴 겹침은 창을 넓혀도 풀리지 않으므로 건드리지 않는다', () => {
    const form = formWith({ routineIds: ['r1', 'r2'] });
    const rs = [routine({ id: 'r1', startTime: '19:00', endTime: '20:00' }), routine({ id: 'r2', startTime: '19:30', endTime: '20:30' })];
    const next = widenWindows(form, diagnoseRoutineFit(form, rs), 'r2');
    expect(next.weekdayHours).toEqual(form.weekdayHours);
  });
});

describe('suggestMoveIn', () => {
  it('길이를 유지한 채 창 안 첫 빈자리를 제안한다', () => {
    const form = formWith({ routineIds: ['r1'] });
    expect(suggestMoveIn(form, [routine({ id: 'r1', startTime: '07:30', endTime: '08:00' })], 'r1'))
      .toEqual({ start: '18:00', end: '18:30' });
  });

  it('같은 요일의 다른 루틴은 피한다', () => {
    const form = formWith({ routineIds: ['r1', 'r2'] });
    const rs = [
      routine({ id: 'r1', startTime: '07:30', endTime: '08:00' }),
      routine({ id: 'r2', startTime: '18:00', endTime: '19:00' }),
    ];
    expect(suggestMoveIn(form, rs, 'r1')).toEqual({ start: '19:00', end: '19:30' });
  });

  it('주말에만 도는 루틴은 주말 창에서 자리를 찾는다', () => {
    const form = formWith({ routineIds: ['r1'] });
    expect(suggestMoveIn(form, [routine({ id: 'r1', startTime: '07:00', endTime: '08:40', weekdays: [6] })], 'r1'))
      .toEqual({ start: '10:00', end: '11:40' }); // 주말 창 10–22
  });

  it('자리가 없으면 null', () => {
    const form = formWith({ routineIds: ['r1', 'r2'], weekdayHours: { start: 18, end: 19 } });
    const rs = [
      routine({ id: 'r1', startTime: '07:00', endTime: '08:00' }),
      routine({ id: 'r2', startTime: '18:00', endTime: '19:00' }),
    ];
    expect(suggestMoveIn(form, rs, 'r1')).toBeNull();
  });
});

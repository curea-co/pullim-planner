/**
 * 미리보기 배치 — 루틴이 낀 하루.
 *
 * 지키려는 것: **미리보기는 저장 결과의 근사다.** 서버가 굽는 것보다 많이도, 적게도
 * 보여주면 안 된다. BE 는 가용 창과 무관하게 루틴을 굽고(`bakeRoutines`) 겹치는 생성
 * 블록을 버린다(`excludeOverlapping`) — 휴리스틱도 같은 규칙이어야 한다.
 *
 * 화면 문자열이 아니라 배치 결과(시각 구간)를 검사한다.
 */
import { render, screen } from '@testing-library/react';

jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn(), warning: jest.fn() } }));

import { initialPlannerForm, initialScopeState, type PlannerForm } from '@/components/features/planner-builder/components/builder-types';
import { PStep4Confirm } from '@/components/features/planner-builder/components/step-content';
import type { Routine } from '@/lib/mock';

const routine = (over: Partial<Routine> & Pick<Routine, 'id'>): Routine => ({
  title: '루틴', subject: 'math', type: 'concept',
  startTime: '19:00', endTime: '19:50', weekdays: [0, 1, 2, 3, 4, 5, 6],
  ...over,
});

const baseForm: PlannerForm = {
  ...initialPlannerForm,
  examStartDate: '', examEndDate: '',      // 시험일 미정 — 7일 전부 생성일
  subjectUnits: { math: ['수학Ⅰ'] },
  routineIds: ['r1'],                       // 4단계에서 고른 루틴
  weekdayHours: { start: 18, end: 23 },
  weekendHours: { start: 18, end: 23 },
  blockPattern: 'deep',                     // 90분 + 15분 휴식
};

/** 화면의 모든 블록 시각을 "HH:MM–HH:MM" 목록으로 — 선택된 날 카드 기준. */
function renderedSlots(form: PlannerForm, routines: Routine[]): string[] {
  render(
    <PStep4Confirm
      form={form}
      setForm={() => {}}
      scope={initialScopeState(form)}
      routines={routines}
    />,
  );
  return screen
    .getAllByText(/^\d{2}:\d{2}–\d{2}:\d{2}$/)
    .map(el => el.textContent ?? '');
}

const overlaps = (a: string, b: string) => {
  const toMin = (hm: string) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
  const [as, ae] = a.split('–').map(toMin);
  const [bs, be] = b.split('–').map(toMin);
  return as < be && bs < ae;
};

describe('미리보기 배치 — 루틴이 낀 하루', () => {
  it('창을 걸쳐 보류된 루틴 위에는 생성 블록을 얹지 않는다', () => {
    // 17:30–18:30 루틴은 창(18–23)을 걸쳐 '보류'로 표기되지만 점유는 점유다. 종전에는
    // 보류를 겹침 계산에서 빼 18:00 블록이 그대로 얹혔다 — 서버엔 없는 블록이다.
    const straddling = routine({ id: 'r1', startTime: '17:30', endTime: '18:30' });
    const slots = renderedSlots(baseForm, [straddling]);
    expect(screen.getAllByText('보류 · 가용 시간 걸침').length).toBeGreaterThan(0);
    expect(slots.filter(s => s !== '17:30–18:30').every(s => !overlaps(s, '17:30–18:30'))).toBe(true);
  });

  it('창 밖 루틴도 점유로 센다', () => {
    // BE 는 창과 무관하게 굽는다 — 17:00–18:20 루틴이 창 앞머리를 물면 18:00 블록은 안 생긴다.
    const outside = routine({ id: 'r1', startTime: '17:00', endTime: '18:20' });
    const slots = renderedSlots(baseForm, [outside]);
    expect(slots).not.toContain('18:00–19:30');
  });

  it('격자는 창 시작 고정 — 서버가 만들지 않는 블록을 지어내지 않는다', () => {
    // 창 한가운데 루틴이 있어도 격자를 루틴 끝에서 새로 깔지 않고, 창 끝 잔여도 채우지 않는다.
    const slots = renderedSlots(baseForm, [routine({ id: 'r1', startTime: '20:00', endTime: '20:50' })]);
    expect(slots).toEqual(['18:00–19:30', '20:00–20:50', '21:30–23:00']);
  });

  it('루틴이 없으면 창 전체에 격자를 깐다', () => {
    const slots = renderedSlots({ ...baseForm, routineIds: [] }, []);
    expect(slots).toEqual(['18:00–19:30', '19:45–21:15', '21:30–23:00']);
  });
});

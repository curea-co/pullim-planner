/**
 * 미리보기 배치 — 루틴이 낀 하루.
 *
 * 지키려는 것: **미리보기는 저장 결과의 근사다.** 서버가 굽는 것보다 많이도, 적게도
 * 보여주면 안 된다. BE 는 가용 창과 무관하게 루틴을 굽고(`bakeRoutines`) 겹치는 생성
 * 블록을 버린다(`excludeOverlapping`) — 휴리스틱도 같은 규칙이어야 한다.
 *
 * 배치 결과(시각 구간)와 함께 **블록 메타데이터 시퀀스**(과목·단원·유형)도 검사한다 —
 * 시각만 보면 커서가 한 칸씩 밀리는 회귀를 놓친다.
 */
import { cleanup, render, screen } from '@testing-library/react';

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

/**
 * 메타데이터 시퀀스 — 겹쳐서 버린 슬롯도 커서를 소비한다.
 *
 * BE `generateSchedule` 은 가용 창을 슬롯으로 전부 채운 **뒤** `excludeOverlapping` 으로
 * 루틴과 겹치는 것을 버린다. 즉 버려진 슬롯도 과목 인터리빙·단원 라운드로빈·일요일 모의
 * 판정의 자리를 이미 소비한 상태다. 휴리스틱이 겹친 슬롯을 아예 건너뛰면 시각 구간은
 * 맞는데 과목·단원·유형만 한 칸씩 밀린다 — 시각만 보는 위 테스트로는 안 잡힌다(Codex).
 */
describe('미리보기 메타데이터 시퀀스 — 겹친 슬롯도 커서를 소비한다', () => {
  // 과목 2개 · 과목당 단원 2개 — 인터리빙과 단원 라운드로빈이 화면에 드러나게.
  const metaForm: PlannerForm = {
    ...baseForm,
    subjectUnits: { math: ['수학Ⅰ', '수학Ⅱ'], english: ['영단어', '독해'] },
  };

  /** 선택된 날 카드의 블록 줄 전체 — 시각·과목·유형·단원이 한 줄에 다 들어간다. */
  function renderedLines(form: PlannerForm, routines: Routine[]): string[] {
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
      .map(el => el.closest('li'))
      .filter((li): li is HTMLLIElement => li !== null)
      .map(li => (li.textContent ?? '').replace(/\s+/g, ' ').trim());
  }

  /** 루틴 배지가 붙은 줄을 뺀 나머지 = AI 생성 블록. */
  const generatedOnly = (lines: string[]) => lines.filter(l => !l.includes('루틴'));

  it('첫 슬롯이 루틴에 가려져도 다음 블록은 두 번째 슬롯의 과목·단원·유형을 쓴다', () => {
    // 창 18–23 · 딥워크(90+15) → 슬롯 3개(18:00 / 19:45 / 21:30).
    const solo = generatedOnly(renderedLines({ ...metaForm, routineIds: [] }, []));
    expect(solo).toHaveLength(3);
    cleanup();

    // 18:00–19:00 루틴이 첫 슬롯을 덮는다 — 둘째·셋째 슬롯만 화면에 남아야 한다.
    const blocked = generatedOnly(
      renderedLines(metaForm, [routine({ id: 'r1', title: '학원', startTime: '18:00', endTime: '19:00' })]),
    );

    // 시각뿐 아니라 과목·단원·유형까지 "겹침이 없었을 때의 2·3번째 슬롯"과 같아야 한다.
    expect(blocked).toEqual(solo.slice(1));

    // 밀림이 나면 여기서 첫 슬롯(수학·개념·수학Ⅰ)이 19:45 로 내려온다.
    expect(blocked[0]).toContain('19:45–21:15');
    expect(blocked[0]).toContain('영어');
    expect(blocked[0]).toContain('영단어');
    expect(blocked[0]).toContain('암기');
    expect(blocked[0]).not.toContain('수학Ⅰ');
  });

  it('일요일 첫 슬롯이 루틴에 가려지면 모의 블록은 그날 아예 없다', () => {
    // BE 는 모의를 slotIdx 0 에만 붙이고 그 슬롯째로 버린다 — 다음 슬롯이 물려받지 않는다.
    // 오늘=토(2026-09-05) 고정 → 미리보기 첫 카드가 일요일(09-06), 시험까지 D-20(임박 구간).
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-05T00:00:00Z'));
    try {
      const sundayForm: PlannerForm = {
        ...metaForm, examStartDate: '2026-09-26', examEndDate: '2026-09-26',
      };

      const solo = generatedOnly(renderedLines({ ...sundayForm, routineIds: [] }, []));
      expect(solo[0]).toContain('18:00–19:30');
      expect(solo[0]).toContain('모의 시험');
      cleanup();

      const blocked = generatedOnly(
        renderedLines(sundayForm, [routine({ id: 'r1', title: '학원', startTime: '18:00', endTime: '19:00' })]),
      );
      expect(blocked).toEqual(solo.slice(1));
      expect(blocked.some(l => l.includes('모의 시험'))).toBe(false);
    } finally {
      nowSpy.mockRestore();
    }
  });
});

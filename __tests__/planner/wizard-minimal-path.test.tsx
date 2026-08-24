/**
 * 위저드 최소 경로 — 단계 구성 · 자동 시험명 · 시험일 프리셋 · '직접 설정' 복원.
 *
 * 축소의 핵심 약속을 지키는지 본다: 묻는 건 3개뿐이지만 뺀 항목은 사라진 게 아니라
 * '직접 설정'에서 되돌아온다.
 */
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn(), warning: jest.fn() } }));

import {
  autoExamName, initialPlannerForm, initialScopeState, plannerStepConfig,
  resolvedExamName, withAutoExamName, formToPlannerPatch, hasCustomBasics, goalBlocker,
  type PlannerForm,
} from '@/components/features/planner-builder/components/builder-types';
import { examPresets, presetNameForDate } from '@/lib/planner/exam-presets';
import { PlannerWizard } from '@/components/features/planner-manage/components/planner-wizard';

const TODAY = '2026-08-24';

function formWith(patch: Partial<PlannerForm>): PlannerForm {
  return { ...initialPlannerForm, ...patch };
}

describe('위저드 단계 구성', () => {
  it('입력 3단계 + 확인 1단계만 남는다', () => {
    expect(plannerStepConfig.map(s => s.key)).toEqual(['goal', 'hours', 'subjects', 'activate']);
    expect(plannerStepConfig.map(s => s.num)).toEqual([1, 2, 3, 4]);
  });
});

describe('시험일 프리셋', () => {
  it('오늘보다 과거인 날짜는 제안하지 않는다', () => {
    // 연말·연초 어디에서 열어도 하한(오늘)에 막히는 값을 채워 주면 안 된다.
    for (const today of ['2026-01-01', '2026-06-05', '2026-11-20', '2026-12-31']) {
      for (const type of ['mock', 'suneung'] as const) {
        for (const p of examPresets(type, today)) {
          expect(p.date >= today).toBe(true);
        }
      }
    }
  });

  it('시험 당일에는 그날 회차를 그대로 준다', () => {
    // 당일을 지난 것으로 치면 수능날 플래너를 만들 때 이듬해 회차가 잡힌다.
    // 시험일 하한(goalBlocker)이 `< 오늘` 만 막으므로 프리셋도 당일을 살려야 짝이 맞는다.
    const [suneung] = examPresets('suneung', '2026-11-19'); // 2026 수능 = 11월 3번째 목
    expect(suneung.date).toBe('2026-11-19');
    expect(suneung.name).toBe('2027학년도 수능');

    const [mock] = examPresets('mock', '2026-09-01'); // 9월 모의평가 = 9월 1번째 화
    expect(mock.date).toBe('2026-09-01');
    expect(mock.name).toBe('2026 9월 모의평가');
  });

  it('수능은 한 회차만 준다', () => {
    expect(examPresets('suneung', TODAY)).toHaveLength(1);
  });

  it('모의고사는 다음 한 회차만 준다 — 코앞일 때만 그 다음 회차도', () => {
    // 2026-08-24 기준 다음 회차는 9월 모의평가(D-7 초과) → 한 개
    expect(examPresets('mock', TODAY)).toHaveLength(1);
    // 9월 모의평가(2026-09-01) 이틀 전이면 10월 학평(D-60 이내)도 함께
    expect(examPresets('mock', '2026-08-30').length).toBeGreaterThan(1);
  });

  it('날짜만으로 회차 이름을 되짚는다', () => {
    const [next] = examPresets('suneung', TODAY);
    expect(presetNameForDate('suneung', next.date)).toBe(next.name);
    expect(presetNameForDate('suneung', '2026-11-01')).toBeNull();
  });
});

describe('자유 목표 — 최소 경로에서도 받는다', () => {
  // 시험명은 종류·날짜에서 파생할 수 있지만 자유 목표는 파생할 근거가 없다. 게다가 BE
  // `target.value` 는 free 일 때 비빈 문자열 필수라, 비워 두면 저장이 400 으로 실패한다.
  it('목표를 적기 전에는 1단계를 통과하지 못한다', () => {
    const form = formWith({ examType: 'other', examStartDate: '2026-12-01', targetGoal: '' });
    expect(goalBlocker(form)).toBe('무엇을 목표로 할지 적어주세요');
  });

  it('목표를 적으면 통과한다', () => {
    const form = formWith({ examType: 'other', examStartDate: '2026-12-01', targetGoal: '토익 750점' });
    expect(goalBlocker(form)).toBeNull();
  });

  it('공백만 적은 것은 통과로 치지 않는다', () => {
    const form = formWith({ examType: 'other', examStartDate: '2026-12-01', targetGoal: '   ' });
    expect(goalBlocker(form)).not.toBeNull();
  });

  it('시험 종류에는 목표를 요구하지 않는다', () => {
    expect(goalBlocker(formWith({ examType: 'mock', examStartDate: '2026-12-01' }))).toBeNull();
  });
});

describe('자동 시험명', () => {
  it('시험 종류·날짜에서 이름을 만든다', () => {
    const [suneung] = examPresets('suneung', TODAY);
    expect(autoExamName(formWith({ examType: 'suneung', examStartDate: suneung.date }))).toBe(suneung.name);
    expect(autoExamName(formWith({ examType: 'midterm', examStartDate: '2026-10-14' }))).toBe('2026 2학기 중간고사');
    expect(autoExamName(formWith({ examType: 'other', targetGoal: '토익 750점' }))).toBe('토익 750점');
  });

  it('학생이 손대지 않은 이름은 날짜를 바꾸면 함께 바뀐다', () => {
    const prev = formWith({ examType: 'midterm', examStartDate: '2026-10-14', examName: '2026 2학기 중간고사' });
    const next = withAutoExamName(prev, { ...prev, examStartDate: '2026-04-21' });
    expect(next.examName).toBe('2026 1학기 중간고사');
  });

  it('직접 쓴 이름은 날짜를 바꿔도 유지된다', () => {
    const prev = formWith({ examType: 'midterm', examStartDate: '2026-10-14', examName: '내신 마지막 승부' });
    const next = withAutoExamName(prev, { ...prev, examStartDate: '2026-04-21' });
    expect(next.examName).toBe('내신 마지막 승부');
  });

  it('이름을 묻지 않아도 저장 페이로드의 name 은 비지 않는다', () => {
    const patch = formToPlannerPatch(formWith({ examType: 'midterm', examStartDate: '2026-10-14', examName: '' }));
    expect(patch.name).toBe('2026 2학기 중간고사');
    expect(patch.examLabel).toBe(patch.name);
  });

  it('resolvedExamName 은 빈 이름을 자동 이름으로 채운다', () => {
    expect(resolvedExamName(formWith({ examType: 'mock', examStartDate: '2026-09-01', examName: '' })))
      .toBe(autoExamName(formWith({ examType: 'mock', examStartDate: '2026-09-01' })));
  });
});

describe('2단계 — 하루 가용 시간', () => {
  it('프리셋 4종과 시험까지 쓸 수 있는 총량을 보여준다', () => {
    const form = formWith({ examType: 'midterm', examStartDate: '2099-05-01', examEndDate: '2099-05-03' });
    render(
      <PlannerWizard
        form={form} setForm={jest.fn()}
        scope={initialScopeState(form)} setScope={jest.fn()}
        currentStep={2} canPrev canNext blockedReason={null} maxReachable={4}
        onPrev={jest.fn()} onNext={jest.fn()} onJump={jest.fn()}
        mode="create" onActivate={jest.fn()}
      />,
    );
    for (const label of ['학교만', '학원 다녀', '자습실 위주', '방학·재수']) {
      expect(screen.getByRole('button', { name: new RegExp(label) })).toBeInTheDocument();
    }
    // 기본값(평일 18–23 · 주말 10–22) = 5*5 + 12*2 = 49시간
    expect(screen.getByText('49시간')).toBeInTheDocument();
    expect(screen.getByText(/이 예산에 맞춰 범위를 잡습니다/)).toBeInTheDocument();
  });
});

describe('직접 설정 — 제외 항목 복원', () => {
  function renderWizard(props: Partial<React.ComponentProps<typeof PlannerWizard>> = {}) {
    const form = formWith({ examType: 'midterm', examStartDate: '2099-05-01', examEndDate: '2099-05-03' });
    return render(
      <PlannerWizard
        form={form}
        setForm={jest.fn()}
        scope={initialScopeState(form)}
        setScope={jest.fn()}
        currentStep={1}
        canPrev={false}
        canNext
        blockedReason={null}
        maxReachable={4}
        onPrev={jest.fn()}
        onNext={jest.fn()}
        onJump={jest.fn()}
        mode="create"
        onActivate={jest.fn()}
        {...props}
      />,
    );
  }

  it('최소 경로에서는 시험명·목표·다짐을 묻지 않는다', () => {
    renderWizard();
    expect(screen.queryByLabelText('목표 시험명')).toBeNull();
    expect(screen.queryByLabelText('한 줄 다짐')).toBeNull();
  });

  it('직접 설정을 켜면 뺀 항목이 되돌아온다', () => {
    renderWizard();
    fireEvent.click(screen.getByRole('button', { name: /직접 설정/ }));
    expect(screen.getByLabelText('목표 시험명')).toBeInTheDocument();
    expect(screen.getByLabelText('한 줄 다짐')).toBeInTheDocument();
    // 중간고사는 목표 점수형
    expect(screen.getByText(/목표 점수/)).toBeInTheDocument();
  });

  it('수정 모드에서 기존 값이 있으면 직접 설정을 켜 둔 채로 시작한다', () => {
    renderWizard({ initialExpert: true });
    expect(screen.getByLabelText('목표 시험명')).toBeInTheDocument();
  });

  it('4단계에서도 뺀 설정을 되돌려 받는다', () => {
    const form = formWith({
      examType: 'midterm',
      examStartDate: '2099-05-01',
      examEndDate: '2099-05-03',
      subjectUnits: { english: ['빈칸 추론', '어법'] },
    });
    const { rerender } = render(
      <PlannerWizard
        form={form} setForm={jest.fn()}
        scope={initialScopeState(form)} setScope={jest.fn()}
        currentStep={4} canPrev canNext={false} blockedReason={null} maxReachable={4}
        onPrev={jest.fn()} onNext={jest.fn()} onJump={jest.fn()}
        mode="create" onActivate={jest.fn()}
      />,
    );
    expect(screen.queryByText('동기 부여 스타일')).toBeNull();
    expect(screen.getByText(/여기서 안 물어보는 것/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /직접 설정/ }));
    rerender(
      <PlannerWizard
        form={form} setForm={jest.fn()}
        scope={initialScopeState(form)} setScope={jest.fn()}
        currentStep={4} canPrev canNext={false} blockedReason={null} maxReachable={4}
        onPrev={jest.fn()} onNext={jest.fn()} onJump={jest.fn()}
        mode="create" onActivate={jest.fn()}
      />,
    );
    expect(screen.getByText('동기 부여 스타일')).toBeInTheDocument();
  });

  it('루틴 게이트가 꺼져 있어도 4단계가 성립한다', () => {
    // prod 기본값(ROUTINE_ENABLED off) — 루틴 조정 섹션만 빠지고 나머지로 완결된다
    const form = formWith({
      examType: 'midterm',
      examStartDate: '2099-05-01',
      examEndDate: '2099-05-03',
      subjectUnits: { english: ['빈칸 추론', '어법'] },
    });
    render(
      <PlannerWizard
        form={form} setForm={jest.fn()}
        scope={initialScopeState(form)} setScope={jest.fn()}
        currentStep={4} canPrev canNext={false} blockedReason={null} maxReachable={4}
        onPrev={jest.fn()} onNext={jest.fn()} onJump={jest.fn()}
        mode="create" onActivate={jest.fn()}
      />,
    );
    expect(screen.queryByText('내 루틴')).toBeNull();
    expect(screen.queryByText(/선택한 루틴/)).toBeNull();
    expect(screen.getByText('블록 길이')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /플래너 활성화/ })).toBeInTheDocument();
  });

  it('hasCustomBasics 는 학생이 넣은 값만 감지한다', () => {
    expect(hasCustomBasics(formWith({ examType: 'midterm', examStartDate: '2026-10-14' }))).toBe(false);
    expect(hasCustomBasics(formWith({ motto: '영어 빈칸 사수' }))).toBe(true);
    expect(hasCustomBasics(formWith({ motivationStyle: 'spartan' }))).toBe(true);
    expect(hasCustomBasics(formWith({ examType: 'mock', examStartDate: '2026-09-01', targetGrade: '2' }))).toBe(true);
  });
});

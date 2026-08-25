/**
 * 위저드 최소 경로 — 단계 구성 · 자동 시험명 · 시험일 프리셋 · 뺀 항목 복원.
 *
 * 축소의 핵심 약속을 지키는지 본다: 묻는 건 3개뿐이지만 뺀 항목은 사라진 게 아니라
 * 1단계 '시험명·다짐 직접 쓰기'에서 되돌아온다. 그 토글은 **1단계에만** 둔다 —
 * 다른 단계에서는 여는 게 없어 죽은 버튼이 되기 때문이다.
 */
import { useEffect, useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn(), warning: jest.fn() } }));

/**
 * 기능 플래그 — `lib/flags` 는 모듈 로드 시점의 env 로 상수를 굳혀서 테스트에서 env 를
 * 갈아 끼워도 반영되지 않는다. getter 로 감싼 mock 을 두고 케이스마다 값만 바꾼다.
 * (나머지 플래그는 실제 값 그대로 — 기본 차단)
 */
const mockFlags = { notifications: false, weakness: false };
jest.mock('@/lib/flags', () => ({
  ...jest.requireActual('@/lib/flags'),
  get NOTIFICATIONS_ENABLED() { return mockFlags.notifications; },
  get WEAKNESS_ENABLED() { return mockFlags.weakness; },
}));

beforeEach(() => {
  mockFlags.notifications = false;
  mockFlags.weakness = false;
});

import {
  autoExamName, initialPlannerForm, initialScopeState, plannerStepConfig,
  resolvedExamName, withAutoExamName, formToPlannerPatch, hasCustomBasics, goalBlocker,
  plannerToForm,
  type PlannerForm,
} from '@/components/features/planner-builder/components/builder-types';
import { examPresets, presetNameForDate } from '@/lib/planner/exam-presets';
import { PlannerWizard } from '@/components/features/planner-manage/components/planner-wizard';
import type { Planner } from '@/lib/mock';

const TODAY = '2026-08-24';

function formWith(patch: Partial<PlannerForm>): PlannerForm {
  return { ...initialPlannerForm, ...patch };
}

/**
 * form 상태를 실제로 들고 도는 위저드 — 입력 한 번이 setForm 을 거쳐 다음 렌더까지
 * 어떻게 반영되는지 본다. 최신 form 은 `onFormChange` 로 흘려보내 검증한다.
 */
function StatefulWizard({ start, onFormChange }: { start: PlannerForm; onFormChange: (f: PlannerForm) => void }) {
  const [form, setForm] = useState(start);
  const [scope, setScope] = useState(() => initialScopeState(start));
  useEffect(() => { onFormChange(form); }, [onFormChange, form]);
  return (
    <PlannerWizard
      form={form} setForm={setForm}
      scope={scope} setScope={setScope}
      currentStep={1} canPrev={false} canNext blockedReason={null} maxReachable={4}
      onPrev={jest.fn()} onNext={jest.fn()} onJump={jest.fn()}
      mode="create" onActivate={jest.fn()}
    />
  );
}

/** 수정 모드 프리필(plannerToForm) 검증용 — 저장된 목표만 갈아 끼운다 */
function plannerWith(target: Planner['target']): Planner {
  return {
    id: 'pl_test',
    name: '테스트 시간표',
    examType: target.kind === 'score' ? 'final' : 'mock',
    examLabel: '테스트 시간표',
    examStartDate: '2026-12-01',
    examEndDate: '2026-12-01',
    target,
    weekdayHours: { start: 18, end: 23 },
    weekendHours: { start: 10, end: 22 },
    subjectUnits: { math: ['미적분'] },
    blockPattern: 'focused',
    weaknessAutoReflect: false,
    motivationStyle: 'guided',
    motto: '',
    active: false,
    archived: false,
    createdAt: '2026-08-01T09:00:00',
    updatedAt: '2026-08-01T09:00:00',
  };
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

describe('목표 — 최소 경로에서도 받는다', () => {
  // 목표는 시간표 배치를 바꾸지 않지만 BE `target` 이 필수다. 묻지 않으면 학생이 정하지
  // 않은 값이 저장된다 — 빈 등급은 1등급으로 박히고, 자유 목표는 비빈 문자열 필수라 400.
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

  it('등급 시험은 목표 등급을 정해야 통과한다', () => {
    const base = { examType: 'mock' as const, examStartDate: '2026-12-01' };
    expect(goalBlocker(formWith({ ...base, targetGrade: '' }))).toBe('목표 등급을 정해주세요');
    expect(goalBlocker(formWith({ ...base, targetGrade: '2' }))).toBeNull();
  });

  it('범위 밖 등급은 통과하지 못한다 — 비어 있을 때와 문구를 구분한다', () => {
    // 입력 UI 는 1~8 만 타이핑되게 막지만, 순수 함수가 범위를 안 보면 프리필 경로가 뚫린다.
    const base = { examType: 'mock' as const, examStartDate: '2026-12-01' };
    for (const bad of ['9', '0', '12', '2.5', 'NaN']) {
      expect(goalBlocker(formWith({ ...base, targetGrade: bad }))).toBe('목표 등급은 1~8 중에서 정해주세요');
    }
    for (const ok of ['1', '4', '8']) {
      expect(goalBlocker(formWith({ ...base, targetGrade: ok }))).toBeNull();
    }
  });

  it('수정 모드 프리필로 들어온 오염 등급도 막는다', () => {
    // plannerToForm 은 저장된 값을 그대로 되살린다 — BE 는 grade 를 유한 number 로만 검증하므로
    // 레거시 9 등급이 남아 있으면 1단계를 통과하고 formToPlannerPatch 가 다시 전송한다.
    const form = plannerToForm(plannerWith({ kind: 'grade', value: 9 }));
    expect(form.targetGrade).toBe('9');
    expect(goalBlocker(form)).toBe('목표 등급은 1~8 중에서 정해주세요');
    expect(goalBlocker(plannerToForm(plannerWith({ kind: 'grade', value: 2 })))).toBeNull();
  });

  it('점수 시험은 화면에 기본값이 보이므로 막지 않는다', () => {
    expect(goalBlocker(formWith({ examType: 'midterm', examStartDate: '2026-12-01', examEndDate: '2026-12-03' }))).toBeNull();
  });

  it('점수도 범위 밖 프리필은 막는다 — UI 는 0~100 을 전제로 한다', () => {
    const outOfRange = '목표 점수는 0~100 사이로 정해주세요';
    expect(goalBlocker(plannerToForm(plannerWith({ kind: 'score', value: 250 })))).toBe(outOfRange);
    expect(goalBlocker(plannerToForm(plannerWith({ kind: 'score', value: -5 })))).toBe(outOfRange);
    // 숫자가 아닌 값은 Number() 가 NaN 이 되고, 그대로 저장하면 BE 검증에서 400 이 된다.
    expect(goalBlocker(plannerToForm(plannerWith({ kind: 'score', value: '만점' })))).toBe(outOfRange);
    expect(goalBlocker(plannerToForm(plannerWith({ kind: 'score', value: 88 })))).toBeNull();
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

  it('자유 목표를 적으면 자동 이름도 함께 따라온다', () => {
    // '자유 목표'로 바꾼 시점엔 목표가 비어 있어 자동 이름이 '자유 목표'로 굳는다.
    // 그 뒤 목표를 적었는데 이름이 안 따라오면 요약·저장명이 '자유 목표'로 남는다.
    let latest = initialPlannerForm;
    render(<StatefulWizard start={initialPlannerForm} onFormChange={f => { latest = f; }} />);

    fireEvent.click(screen.getByRole('button', { name: /자유 목표/ }));
    expect(latest.examName).toBe('자유 목표');

    fireEvent.change(screen.getByPlaceholderText(/토익 750점/), { target: { value: '토익 750점' } });
    expect(resolvedExamName(latest)).toBe('토익 750점');
  });

  it('직접 쓴 이름은 자유 목표를 고쳐도 유지된다', () => {
    const start = formWith({ examType: 'other' });
    let latest = start;
    render(<StatefulWizard start={start} onFormChange={f => { latest = f; }} />);

    fireEvent.click(screen.getByRole('button', { name: /시험명·다짐 직접 쓰기/ }));
    fireEvent.change(screen.getByLabelText('목표 시험명'), { target: { value: '내가 정한 이름' } });
    fireEvent.change(screen.getByPlaceholderText(/토익 750점/), { target: { value: '토익 750점' } });

    expect(latest.examName).toBe('내가 정한 이름');
    expect(resolvedExamName(latest)).toBe('내가 정한 이름');
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
  it('프리셋 4종과 주간 합계를 보여준다', () => {
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
  });
});

describe('시험명·다짐 직접 쓰기 — 제외 항목 복원', () => {
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

  it('토글을 켜면 뺀 항목이 되돌아온다', () => {
    renderWizard();
    fireEvent.click(screen.getByRole('button', { name: /시험명·다짐 직접 쓰기/ }));
    expect(screen.getByLabelText('목표 시험명')).toBeInTheDocument();
    expect(screen.getByLabelText('한 줄 다짐')).toBeInTheDocument();
    // 중간고사는 목표 점수형
    expect(screen.getByText(/목표 점수/)).toBeInTheDocument();
  });

  it('수정 모드에서 기존 값이 있으면 펼친 채로 시작한다', () => {
    renderWizard({ initialExpert: true });
    expect(screen.getByLabelText('목표 시험명')).toBeInTheDocument();
  });

  it('1단계 밖에서는 토글을 렌더하지 않는다', () => {
    // 2·3단계는 `expert` 로 여는 게 처음부터 없었고, 4단계도 알림·약점이 각자의 기능
    // 플래그로 분리된 뒤로는 `expert` 로 열 항목이 없다 — 죽은 버튼을 두지 않는다.
    const form = formWith({
      examType: 'midterm',
      examStartDate: '2099-05-01',
      examEndDate: '2099-05-03',
      subjectUnits: { english: ['빈칸 추론', '어법'] },
    });
    for (const step of [2, 3, 4]) {
      const view = render(
        <PlannerWizard
          form={form} setForm={jest.fn()}
          scope={initialScopeState(form)} setScope={jest.fn()}
          currentStep={step} canPrev canNext={step < 4} blockedReason={null} maxReachable={4}
          onPrev={jest.fn()} onNext={jest.fn()} onJump={jest.fn()}
          mode="create" onActivate={jest.fn()}
        />,
      );
      expect(screen.queryByRole('button', { name: /직접 쓰기/ })).toBeNull();
      view.unmount();
    }
  });

  it('4단계에서 동기 스타일은 고를 수도, 요약에 뜨지도 않는다', () => {
    // 고를 수 있는 화면이 어디에도 없는 값을 요약에만 보여주지 않는다(오너 지적).
    // `form.motivationStyle` 자체는 BE 계약이라 그대로 저장된다.
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
        initialExpert
      />,
    );
    expect(screen.queryByText('동기 부여 스타일')).toBeNull();
    expect(screen.queryByText(/동기 스타일/)).toBeNull();
    expect(formToPlannerPatch(form).motivationStyle).toBe('guided');
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
    expect(hasCustomBasics(formWith({ examName: '내가 정한 이름' }))).toBe(true);
    // 동기 스타일은 고를 화면이 없어졌다 — 저장값이 기본과 달라도 '학생이 넣은 값'이 아니다.
    expect(hasCustomBasics(formWith({ motivationStyle: 'spartan' }))).toBe(false);
    // 목표는 최소 경로에 있다 — 저장된 플래너는 전부 목표를 갖고 있어서(BE 필수) 근거가 될 수 없다.
    expect(hasCustomBasics(formWith({ examType: 'mock', examStartDate: '2026-09-01', targetGrade: '2' }))).toBe(false);
  });
});

/**
 * 4단계 알림·약점 — **각자의 기능 플래그로만** 노출한다.
 *
 * 1단계 '시험명·다짐 직접 쓰기'(`expert`)에 묶어 두면, 플래그를 켠 환경에서 이 설정들이
 * 4단계에서 사라진 것처럼 보이고 수정 플로우도 무관해 보이는 1단계 토글을 찾기 전까지는
 * 조정할 수 없다(Codex). `expert` 는 1단계 전용 개념으로 둔다.
 */
describe('4단계 알림·약점 — 기능 플래그로만 노출', () => {
  const step4Form = formWith({
    examType: 'midterm',
    examStartDate: '2099-05-01',
    examEndDate: '2099-05-03',
    subjectUnits: { english: ['빈칸 추론', '어법'] },
  });

  function renderStep4(props: Partial<React.ComponentProps<typeof PlannerWizard>> = {}) {
    return render(
      <PlannerWizard
        form={step4Form} setForm={jest.fn()}
        scope={initialScopeState(step4Form)} setScope={jest.fn()}
        currentStep={4} canPrev canNext={false} blockedReason={null} maxReachable={4}
        onPrev={jest.fn()} onNext={jest.fn()} onJump={jest.fn()}
        mode="create" onActivate={jest.fn()}
        {...props}
      />,
    );
  }

  /** 조정 패널 섹션 제목(`<summary>` 안) — 본문 h4·요약 줄의 같은 문구와 구분한다 */
  const sectionTitle = (name: string) => screen.queryByText(name, { selector: 'summary span' });

  it('기본 플래그(둘 다 차단)에서는 두 섹션 모두 없다', () => {
    renderStep4();
    expect(screen.queryByText('알림')).toBeNull();
    expect(screen.queryByText('약점 자동 반영')).toBeNull();
    // 요약 줄도 같은 기준 — 고칠 수 없는 설정을 값으로만 보여주지 않는다
    expect(screen.queryByText(/약점 자동 반영:/)).toBeNull();
    expect(screen.queryByText(/알림:/)).toBeNull();
  });

  it('알림 플래그를 켜면 1단계 토글과 무관하게 알림 섹션이 뜬다', () => {
    mockFlags.notifications = true;
    renderStep4();
    expect(sectionTitle('알림')).toBeInTheDocument();
    expect(screen.getByText('앱 푸시')).toBeInTheDocument();
    expect(screen.queryByText('약점 자동 반영')).toBeNull();
  });

  it('약점 플래그를 켜면 1단계 토글과 무관하게 약점 섹션이 뜬다', () => {
    mockFlags.weakness = true;
    renderStep4();
    expect(sectionTitle('약점 자동 반영')).toBeInTheDocument();
    expect(screen.queryByText('알림')).toBeNull();
  });

  it('수정 진입(펼침 꺼짐)에서도 켜진 플래그의 섹션은 그대로 보인다', () => {
    // hasCustomBasics() 가 false 라 initialExpert 가 꺼진 채 들어와도 4단계는 영향 없다
    mockFlags.notifications = true;
    mockFlags.weakness = true;
    renderStep4({ mode: 'edit', initialExpert: false });
    expect(sectionTitle('알림')).toBeInTheDocument();
    expect(sectionTitle('약점 자동 반영')).toBeInTheDocument();
  });
});

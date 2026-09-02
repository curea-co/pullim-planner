/**
 * 보조 문구 정리(2026-08-24) 뒤 **되살린 고지 3건**이 실제로 화면에 뜨는지 본다.
 *
 * 나머지 보조 문구는 "작아서 안 보이느니만 못하다"는 오너 지시로 걷어냈지만, 아래 셋은
 * 정보가 실려 있어 복원했다. 다시 조용히 사라지지 않게 여기서 못 박는다.
 *  1) 미리보기 하단 고지 — 서버 dry-run / 휴리스틱 근사를 구분해 알린다
 *  2) 1단계 시험일 프리셋 주의 — 프리셋 날짜가 추정치임을 알리는 유일한 자리
 *  3) 부모 일일 보고 동의 고지 — 제3자에게 학습 기록이 나가는 유일한 토글
 */
import { render, screen } from '@testing-library/react';

jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn(), warning: jest.fn() } }));

import {
  PStep4Confirm, PStep7Reminder,
} from '@/components/features/planner-builder/components/step-content';
import {
  initialPlannerForm, initialScopeState,
  type PlannerForm,
} from '@/components/features/planner-builder/components/builder-types';
import { PlannerWizard } from '@/components/features/planner-manage/components/planner-wizard';

function formWith(patch: Partial<PlannerForm>): PlannerForm {
  return { ...initialPlannerForm, ...patch };
}

function renderStep1(form: PlannerForm) {
  return render(
    <PlannerWizard
      form={form} setForm={jest.fn()}
      scope={initialScopeState(form)} setScope={jest.fn()}
      currentStep={1} canPrev={false} canNext blockedReason={null} maxReachable={4}
      onPrev={jest.fn()} onNext={jest.fn()} onJump={jest.fn()}
      mode="create" onActivate={jest.fn()}
    />,
  );
}

describe('1단계 — 시험일 프리셋 주의', () => {
  it('프리셋이 날짜를 채워 주는 시험 종류에는 추정치 고지가 뜬다', () => {
    // 수능·모의평가는 관례(11월 3번째 목 등)로 계산한 값이라 해마다 어긋날 수 있다.
    renderStep1(formWith({ examType: 'suneung' }));
    expect(screen.getByText(/관례로 계산한 추정치/)).toBeInTheDocument();
    expect(screen.getByText(/학교에서 받은 일정과 다르면/)).toBeInTheDocument();
  });

  it('프리셋이 없는 시험 종류에는 뜨지 않는다', () => {
    // 중간·기말은 학교마다 달라 날짜를 채워 주지 않는다 — 추정치 고지가 붙을 이유가 없다.
    renderStep1(formWith({ examType: 'midterm', examStartDate: '2099-05-01', examEndDate: '2099-05-03' }));
    expect(screen.queryByText(/관례로 계산한 추정치/)).toBeNull();
  });
});

describe('4단계 — 미리보기 하단 고지', () => {
  const previewForm = formWith({ subjectUnits: { korean: ['화법과 작문 1단원'] } });
  const scope = initialScopeState(previewForm);

  it('서버 dry-run 이 없으면 휴리스틱 근사임을 알린다', () => {
    render(
      <PStep4Confirm form={previewForm} setForm={jest.fn()} scope={scope} routines={[]} />,
    );
    expect(screen.getByText(/자동 생성 예시/)).toBeInTheDocument();
    expect(screen.queryByText(/실제 생성 규칙으로 계산된 미리보기/)).toBeNull();
  });

  it('서버 dry-run 결과가 오면 실제 계산 결과임을 알린다', async () => {
    render(
      <PStep4Confirm
        form={previewForm} setForm={jest.fn()} scope={scope} routines={[]}
        onServerPreview={() => Promise.resolve([{
          offset: 0, monthDay: '8/25', weekdayLabel: '월', isWeekend: false, isExamDay: false,
          items: [{ start: '18:00', end: '18:50', subjectLabel: '국어', type: 'concept', unitLabel: '화법과 작문 1단원' }],
        }])}
      />,
    );
    expect(await screen.findByText(/실제 생성 규칙으로 계산된 미리보기/)).toBeInTheDocument();
    expect(screen.queryByText(/자동 생성 예시/)).toBeNull();
  });
});

describe('알림 — 부모 일일 보고 동의 고지', () => {
  /**
   * `NOTIFICATIONS_ENABLED` 게이트는 이 토글 묶음을 **어느 단계에 끼울지**만 정한다
   * (`PStep7Reminder` 자체는 게이트를 보지 않는다). 게이트가 열렸을 때 학생이 보게 될
   * 화면을 그대로 확인하려고 프리젠터를 직접 렌더한다 — env 를 만지지 않는다.
   */
  it('부모 일일 보고에만 동의 고지가 붙는다', () => {
    render(<PStep7Reminder form={initialPlannerForm} setForm={jest.fn()} />);
    expect(screen.getByText(/본인·부모 양측 동의 후에만 켜집니다/)).toBeInTheDocument();
    // 나머지 두 줄의 설명 문구는 복원하지 않았다 — 라벨만 남는다.
    expect(screen.getByText('앱 푸시')).toBeInTheDocument();
    expect(screen.getByText('시작 5분 전 미리 알림')).toBeInTheDocument();
    expect(screen.queryByText(/가장 즉각적/)).toBeNull();
    expect(screen.queryByText(/휴식·이동 시간 확보/)).toBeNull();
  });
});

/**
 * 확인 단계 요약의 "선택한 루틴 N개" — **미리보기와 같은 집합**을 센다.
 *
 * 삭제된 루틴의 id 가 프리필로 살아 돌아오는 경로가 있다(수정 화면의 `appliedRoutineIds`
 * 는 블록에서 역산). 미리보기(`generatePreview`)와 충돌 배너(`diagnoseRoutineFit`)는 그
 * id 를 이미 버리므로, 요약만 그냥 세면 **미리보기엔 없는 루틴이 요약에만 잡힌다.**
 *
 * 기준은 `routines` 의 길이가 아니라 `routinesLoaded` 다 — 루틴을 전부 지운 사용자는
 * 「로드 성공 · 빈 배열」이라 길이로 판정하면 거르지 않게 되어 어긋난다(Codex).
 */
import { render, screen } from '@testing-library/react';

jest.mock('sonner', () => ({ toast: { error: jest.fn(), success: jest.fn(), warning: jest.fn() } }));

// `lib/flags` 는 모듈 로드 시점 env 로 상수를 굳힌다 — 요약 줄이 ROUTINE_ENABLED 게이트
// 뒤에 있으므로 getter mock 으로 켠다(기존 wizard-minimal-path 와 같은 패턴).
jest.mock('@/lib/flags', () => ({
  ...jest.requireActual('@/lib/flags'),
  get ROUTINE_ENABLED() { return true; },
}));

import { PStep4Confirm } from '@/components/features/planner-builder/components/step-content';
import {
  initialPlannerForm,
  type PlannerForm,
  type ScopeState,
} from '@/components/features/planner-builder/components/builder-types';
import type { Routine } from '@/lib/mock';

const scope: ScopeState = { answer: null, electives: {}, progressCut: {}, settled: [], manualUnits: [] };

/** 살아 있는 r1 과, 루틴 행이 지워진 dead 가 함께 프리필된 상태. */
const form: PlannerForm = {
  ...initialPlannerForm,
  routineIds: ['r1', 'dead'],
  subjectUnits: { korean: ['화법과 작문 1단원'] },
};

const live: Routine = {
  id: 'r1', title: '아침 영단어', subject: 'english', type: 'concept',
  startTime: '07:30', endTime: '08:00', weekdays: [0, 1, 2, 3, 4],
};

function renderConfirm(routines: Routine[], routinesLoaded: boolean) {
  return render(
    <PStep4Confirm
      form={form}
      setForm={() => {}}
      scope={scope}
      routines={routines}
      routinesLoaded={routinesLoaded}
    />,
  );
}

/** 요약 줄의 텍스트 — "· 선택한 루틴: N개" 또는 "· 선택한 루틴: 없음". */
function routineSummary(): string {
  const li = screen.getByText(/선택한 루틴:/).closest('li');
  return li?.textContent ?? '';
}

describe('확인 단계 요약 — 선택한 루틴 수', () => {
  it('로드 성공: 죽은 id 를 빼고 센다', () => {
    renderConfirm([live], true);
    expect(routineSummary()).toContain('1개');
  });

  it('로드 성공 · 빈 목록: 전부 지운 사용자는 "없음" — 미리보기와 일치한다', () => {
    renderConfirm([], true);
    expect(routineSummary()).toContain('없음');
  });

  it('조회 실패: 거르지 않고 원래 수를 보인다 — 모르면서 "없음" 이라 하지 않는다', () => {
    renderConfirm([], false);
    expect(routineSummary()).toContain('2개');
  });
});

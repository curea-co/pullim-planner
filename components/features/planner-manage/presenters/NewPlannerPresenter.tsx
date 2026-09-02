'use client';

import type { ActivateSummary } from '@/components/features/planner-builder/components/step-content';

import { PageHeader } from '@/components/shell/page-header';
import type { PlannerForm, ScopeState } from '@/components/features/planner-builder/components/builder-types';
import type { Routine } from '@/lib/mock';
import type { PreviewDay } from '@/lib/planner/preview-map';
import { PlannerWizard } from '../components/planner-wizard';

interface NewPlannerPresenterProps {
  form: PlannerForm;
  setForm: (f: PlannerForm | ((prev: PlannerForm) => PlannerForm)) => void;
  scope: ScopeState;
  setScope: (s: ScopeState | ((prev: ScopeState) => ScopeState)) => void;
  currentStep: number;
  canPrev: boolean;
  canNext: boolean;
  blockedReason: string | null;
  maxReachable: number;
  onPrev: () => void;
  onNext: () => void;
  onJump: (n: number) => void;
  onActivate: (submitted: PlannerForm, summary?: ActivateSummary) => void;
  routines?: Routine[];
  onServerPreview?: () => Promise<PreviewDay[] | null>;
  onUpdateRoutine?: (routineId: string, patch: { startTime: string; endTime: string }) => Promise<void>;
}

export default function NewPlannerPresenter({
  form, setForm,
  scope, setScope,
  currentStep, canPrev, canNext, blockedReason, maxReachable,
  onPrev, onNext, onJump,
  onActivate,
  routines, onServerPreview, onUpdateRoutine,
}: NewPlannerPresenterProps) {
  return (
    // 위저드는 대시보드가 아니라 한 줄 폼이다 — 셸의 1180px 를 그대로 쓰면 한 단어짜리
    // 선택지가 500px 로 늘어나 칸 안이 텅 빈다. 읽기 좋은 폼 단(768px)으로 묶는다.
    // 가운데 정렬이 아니라 왼쪽 고정 — 브레드크럼·수정 화면 탭바와 같은 왼쪽 끝에 선다.
    <div className="w-full max-w-3xl space-y-4">
      {/* 임시저장 버튼 숨김(soft-open) — 서버 draft BE·영속 API 미구현이라 데모 토스트만 떠서
          "저장됐다" 오해를 유발. 리포트·약점과 동일 원칙(미구현 기능 미노출). BE draft 준비 시 복원. */}
      <PageHeader title="내 맞춤 시간표 만들기" />

      <PlannerWizard
        form={form}
        setForm={setForm}
        scope={scope}
        setScope={setScope}
        currentStep={currentStep}
        canPrev={canPrev}
        canNext={canNext}
        blockedReason={blockedReason}
        maxReachable={maxReachable}
        onPrev={onPrev}
        onNext={onNext}
        onJump={onJump}
        mode="create"
        onActivate={onActivate}
        routines={routines}
        onServerPreview={onServerPreview}
        onUpdateRoutine={onUpdateRoutine}
      />
    </div>
  );
}

'use client';

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
  onActivate: (submitted: PlannerForm) => void;
  routines?: Routine[];
  onServerPreview?: () => Promise<PreviewDay[] | null>;
}

export default function NewPlannerPresenter({
  form, setForm,
  scope, setScope,
  currentStep, canPrev, canNext, blockedReason, maxReachable,
  onPrev, onNext, onJump,
  onActivate,
  routines, onServerPreview,
}: NewPlannerPresenterProps) {
  return (
    <div className="space-y-5">
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
      />
    </div>
  );
}

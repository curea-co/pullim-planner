'use client';

import { Save } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import type { PlannerForm } from '@/components/features/planner-builder/components/builder-types';
import { PlannerWizard } from '../components/planner-wizard';

interface NewPlannerPresenterProps {
  form: PlannerForm;
  setForm: (f: PlannerForm | ((prev: PlannerForm) => PlannerForm)) => void;
  currentStep: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onJump: (n: number) => void;
  onSaveDraft: () => void;
  onActivate: (submitted: PlannerForm) => void;
}

export default function NewPlannerPresenter({
  form, setForm,
  currentStep, canPrev, canNext,
  onPrev, onNext, onJump,
  onSaveDraft, onActivate,
}: NewPlannerPresenterProps) {
  return (
    <div className="space-y-5">
      <PageHeader
        title="내 맞춤 플래너 만들기"
        action={
          <button
            type="button"
            onClick={onSaveDraft}
            className="bg-pullim-slate-900 hover:bg-pullim-slate-800 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold text-white shadow-pullim-sm"
          >
            <Save className="h-4 w-4" />
            임시저장
          </button>
        }
      />

      <PlannerWizard
        form={form}
        setForm={setForm}
        currentStep={currentStep}
        canPrev={canPrev}
        canNext={canNext}
        onPrev={onPrev}
        onNext={onNext}
        onJump={onJump}
        mode="create"
        onActivate={onActivate}
        finishHint="↑ 위 [플래너 활성화] 클릭으로 완료"
      />
    </div>
  );
}

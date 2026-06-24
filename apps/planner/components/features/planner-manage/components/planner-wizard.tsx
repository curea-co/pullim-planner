'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { StepIndicator } from '@/components/features/planner-builder/components/step-indicator';
import {
  PStep1Goal, PStep2Hours, PStep3Subjects, PStep4Pattern, PStep5Routine,
  PStep5Weakness, PStep6Motivation, PStep7Reminder, PStep8Activate,
} from '@/components/features/planner-builder/components/step-content';
import {
  plannerStepConfig, type PlannerForm,
} from '@/components/features/planner-builder/components/builder-types';
import { cn } from '@/lib/utils';

/**
 * 9단계 프로세스 마크업 — new/edit 페이지 공유.
 * 상태/이벤트는 props로 받기만 (presentation).
 */
interface PlannerWizardProps {
  form: PlannerForm;
  setForm: (f: PlannerForm | ((prev: PlannerForm) => PlannerForm)) => void;
  currentStep: number;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  onJump: (n: number) => void;
  mode: 'create' | 'edit';
  onActivate: (submitted: PlannerForm) => void;
  finishHint: string;
}

export function PlannerWizard({
  form, setForm,
  currentStep, canPrev, canNext,
  onPrev, onNext, onJump,
  mode, onActivate, finishHint,
}: PlannerWizardProps) {
  const stepInfo = plannerStepConfig[currentStep - 1];
  const StepIcon = stepInfo.icon;

  return (
    <>
      <StepIndicator
        steps={plannerStepConfig.map(s => ({ num: s.num, label: s.label, icon: s.icon }))}
        current={currentStep}
        onJump={onJump}
      />

      <section className="bg-card rounded-2xl border p-5 lg:p-6">
        <header className="mb-4 flex items-start gap-3 border-b pb-4">
          <div className="bg-pullim-blue-50 text-pullim-blue-700 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <StepIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-pullim-slate-500 text-[10px] font-bold tracking-wider uppercase">
              Step {currentStep} / 9
            </div>
            <h2 className="text-pullim-slate-900 mt-0.5 text-lg font-bold tracking-tight">
              {stepInfo.title}
            </h2>
            <p className="text-pullim-slate-600 mt-1 text-xs leading-relaxed">
              {stepInfo.description}
            </p>
          </div>
        </header>

        <div className="min-h-[280px]">
          {currentStep === 1 && <PStep1Goal form={form} setForm={setForm} />}
          {currentStep === 2 && <PStep2Hours form={form} setForm={setForm} />}
          {currentStep === 3 && <PStep3Subjects form={form} setForm={setForm} />}
          {currentStep === 4 && <PStep4Pattern form={form} setForm={setForm} />}
          {currentStep === 5 && <PStep5Routine form={form} setForm={setForm} />}
          {currentStep === 6 && <PStep5Weakness form={form} setForm={setForm} />}
          {currentStep === 7 && <PStep6Motivation form={form} setForm={setForm} />}
          {currentStep === 8 && <PStep7Reminder form={form} setForm={setForm} />}
          {currentStep === 9 && <PStep8Activate form={form} mode={mode} onActivate={onActivate} />}
        </div>

        <footer className="mt-5 flex items-center justify-between border-t pt-4">
          <button
            type="button"
            onClick={onPrev}
            disabled={!canPrev}
            className={cn(
              'inline-flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-bold transition-colors',
              canPrev
                ? 'bg-pullim-slate-100 text-pullim-slate-700 hover:bg-pullim-slate-200'
                : 'bg-pullim-slate-50 text-pullim-slate-300 cursor-not-allowed',
            )}
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </button>

          <div className="text-pullim-slate-500 hidden sm:block text-[10px] font-mono">
            {currentStep}/9 — {stepInfo.label}
          </div>

          {canNext ? (
            <button
              type="button"
              onClick={onNext}
              className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-pullim-sm"
            >
              다음
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <span className="text-pullim-slate-500 text-[11px] font-semibold">
              {finishHint}
            </span>
          )}
        </footer>
      </section>
    </>
  );
}

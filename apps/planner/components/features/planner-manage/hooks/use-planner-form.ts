'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { examTypeMeta, plannerStepConfig, type PlannerForm } from '@/components/features/planner-builder/components/builder-types';

const TOTAL_STEPS = plannerStepConfig.length;

/**
 * 9단계 프로세스 step navigation + form state — new/edit 공유 hook.
 *
 * 책임: currentStep / form 상태, goPrev/goNext (validation 포함), jumpTo, saveDraft toast.
 * 저장 핸들러(create/activate vs update)는 Container 책임.
 */
export function usePlannerForm(initialForm: PlannerForm, draftFallbackName: string) {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<PlannerForm>(initialForm);

  const canPrev = currentStep > 1;
  const canNext = currentStep < TOTAL_STEPS;

  function goPrev() {
    if (canPrev) setCurrentStep(currentStep - 1);
  }

  function goNext() {
    if (currentStep === 1) {
      if (!form.examName.trim()) {
        toast.error('목표 시험명을 입력해주세요');
        return;
      }
      if (!form.examStartDate) {
        toast.error('시험 날짜를 선택해주세요');
        return;
      }
      // 등급형(모의·수능)은 자유입력 — 숫자가 없으면 저장 시 조용히 1등급으로 치환되므로 차단
      if (examTypeMeta[form.examType ?? 'mock'].targetKind === 'grade') {
        const n = parseInt(form.targetGrade, 10);
        if (!Number.isFinite(n) || n < 1 || n > 9) {
          toast.error('목표 등급을 숫자로 입력해주세요 (예: 1등급)');
          return;
        }
      }
    }
    if (currentStep === 3) {
      const subjectCount = Object.keys(form.subjectUnits ?? {}).length;
      if (subjectCount === 0) {
        toast.error('과목을 1개 이상 추가해주세요');
        return;
      }
    }
    if (canNext) setCurrentStep(currentStep + 1);
  }

  function jumpTo(n: number) {
    setCurrentStep(n);
  }

  function saveDraft() {
    toast.info('💾 임시저장 (데모)', {
      description: `${form.examName || draftFallbackName} · ${currentStep}/${TOTAL_STEPS}단계까지 작성됨`,
    });
  }

  return {
    currentStep, form, setForm,
    canPrev, canNext,
    goPrev, goNext, jumpTo, saveDraft,
  };
}

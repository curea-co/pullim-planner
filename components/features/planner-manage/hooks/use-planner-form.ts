'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  initialScopeState, maxReachableStep, plannerStepConfig, stepBlocker,
  type PlannerForm, type ScopeState,
} from '@/components/features/planner-builder/components/builder-types';

const TOTAL_STEPS = plannerStepConfig.length;

/**
 * 위저드 step navigation + form state — new/edit 공유 hook.
 *
 * 책임: currentStep / form / 학습 범위 게이트 상태, goPrev/goNext(차단 판정 포함), jumpTo.
 * 저장 핸들러(create/activate vs update)는 Container 책임.
 * (임시저장은 서버 draft BE 미구현이라 버튼·핸들러 모두 제거 — soft-open. BE 준비 시 복원.)
 *
 * 차단 판정은 builder-types 의 순수 함수(stepBlocker)에 있다 — 화면 인라인 안내와
 * goNext·활성화 검증이 같은 규칙을 쓰게 하기 위함.
 */
export function usePlannerForm(initialForm: PlannerForm) {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<PlannerForm>(initialForm);
  const [scope, setScope] = useState<ScopeState>(() => initialScopeState(initialForm));

  const canPrev = currentStep > 1;
  const canNext = currentStep < TOTAL_STEPS;
  // 현재 단계에서 다음으로 못 가는 이유 — 화면에도 그대로 노출한다.
  const blockedReason = stepBlocker(plannerStepConfig[currentStep - 1].key, form, scope);
  const maxReachable = maxReachableStep(form, scope);

  function goPrev() {
    if (canPrev) setCurrentStep(currentStep - 1);
  }

  function goNext() {
    if (blockedReason) {
      toast.error(blockedReason);
      return;
    }
    if (canNext) setCurrentStep(currentStep + 1);
  }

  /** 앞 단계가 막혀 있으면 건너뛰지 못한다 — 확인 없이 미리보기로 직행하는 경로 차단 */
  function jumpTo(n: number) {
    if (n > maxReachable) {
      const reason = stepBlocker(plannerStepConfig[maxReachable - 1].key, form, scope);
      if (reason) toast.error(reason);
      setCurrentStep(maxReachable);
      return;
    }
    setCurrentStep(n);
  }

  return {
    currentStep, form, setForm,
    scope, setScope,
    canPrev, canNext, blockedReason, maxReachable,
    goPrev, goNext, jumpTo,
  };
}

'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { examTypeMeta, plannerStepConfig, todayIsoKst, type PlannerForm } from '@/components/features/planner-builder/components/builder-types';
import { subjectLabels, type SubjectKey } from '@/lib/mock';

const TOTAL_STEPS = plannerStepConfig.length;

/**
 * 8단계 프로세스 step navigation + form state — new/edit 공유 hook.
 *
 * 책임: currentStep / form 상태, goPrev/goNext (validation 포함), jumpTo.
 * 저장 핸들러(create/activate vs update)는 Container 책임.
 * (임시저장은 서버 draft BE 미구현이라 버튼·핸들러 모두 제거 — soft-open. BE 준비 시 복원.)
 */
export function usePlannerForm(initialForm: PlannerForm, mode: 'create' | 'edit' = 'create') {
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
      // 계획표는 미래 대상 — 과거 시험일 차단 (input min과 동일 기준, 직접 타이핑 우회 방지).
      // 신규 생성에만 적용 — edit는 이미 지난 시험 플래너의 다른 설정 수정을 막지 않는다(Codex).
      if (mode === 'create' && form.examStartDate < todayIsoKst()) {
        toast.error('시험 날짜는 오늘 이후로 선택해주세요');
        return;
      }
      // 등급형(모의·수능)은 자유입력 — 숫자가 없으면 저장 시 조용히 1등급으로 치환되므로 차단.
      // QA #5 — 허용 범위는 1~8 (9등급은 목표 점수가 아님).
      if (examTypeMeta[form.examType ?? 'mock'].targetKind === 'grade') {
        const n = parseInt(form.targetGrade, 10);
        if (!Number.isFinite(n) || n < 1 || n > 8) {
          toast.error('목표 등급을 1에서 8 사이의 숫자로 입력해주세요');
          return;
        }
      }
    }
    if (currentStep === 3) {
      const units = form.subjectUnits ?? {};
      const subjectCount = Object.keys(units).length;
      if (subjectCount === 0) {
        toast.error('과목과 단원을 1개 이상 추가해주세요');
        return;
      }
      // QA #9 — 과목만 추가하고 단원이 비어 있으면 진행 차단 (모달이 단원 0개 저장을 허용하므로 여기서 방어)
      const emptySubject = (Object.entries(units) as [SubjectKey, string[]][])
        .find(([, u]) => !u || u.length === 0);
      if (emptySubject) {
        toast.error(`'${subjectLabels[emptySubject[0]] ?? emptySubject[0]}' 과목의 단원을 1개 이상 선택해주세요`);
        return;
      }
    }
    if (canNext) setCurrentStep(currentStep + 1);
  }

  function jumpTo(n: number) {
    setCurrentStep(n);
  }

  return {
    currentStep, form, setForm,
    canPrev, canNext,
    goPrev, goNext, jumpTo,
  };
}

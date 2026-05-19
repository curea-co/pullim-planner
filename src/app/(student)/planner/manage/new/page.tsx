'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Wrench, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shell/page-header';
import { FlywheelNote } from '@/components/shell/flywheel-note';
import { StepIndicator } from '@/components/builder/step-indicator';
import {
  PStep1Goal, PStep2Hours, PStep3Subjects, PStep4Pattern,
  PStep5Weakness, PStep6Motivation, PStep7Reminder, PStep8Activate,
} from '@/components/planner-builder/step-content';
import {
  initialPlannerForm, plannerStepConfig, formToPlannerPatch,
  type PlannerForm,
} from '@/components/planner-builder/builder-types';
import { createPlanner, activatePlanner } from '@/lib/mock';
import { cn } from '@/lib/utils';

/**
 * 학생 플래너 빌더 8단계 위저드 — *새 시간표 만들기*.
 * 목표 → 가용시간 → 과목 가중치 → 블록 패턴 → 약점 자동반영 → 동기 스타일 → 알림 → 미리보기·활성화.
 *
 * Plan 2: 기존 `/planner/builder`에서 시간표 관리 하위 `/planner/manage/new`로 이전.
 * Plan 3: 활성화 시 *실제로* `createPlanner` + `activatePlanner` 호출 → 관리 페이지에 즉시 반영.
 */
export default function PlannerBuilderNewPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<PlannerForm>(initialPlannerForm);

  function handleActivate(submitted: PlannerForm) {
    const planner = createPlanner(formToPlannerPatch(submitted));
    activatePlanner(planner.id);
    toast.success('🎯 새 시간표 활성화 완료', {
      description: `${planner.name} — 홈 시간표가 생성됐어요`,
      duration: 3000,
    });
    router.push('/planner/manage');
  }

  const stepInfo = plannerStepConfig[currentStep - 1];
  const canPrev = currentStep > 1;
  const canNext = currentStep < 8;

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
      description: `${form.examName || '새 플래너'} · ${currentStep}/8단계까지 작성됨`,
    });
  }

  const StepIcon = stepInfo.icon;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={{ icon: Wrench, text: '플래너 빌더' }}
        title="내 맞춤 플래너 만들기"
        description="8단계 위저드 — 목표·가용 시간·약점을 종합해 일주일치 플래너를 자동 생성해요."
        action={
          <button
            type="button"
            onClick={saveDraft}
            className="bg-pullim-slate-900 hover:bg-pullim-slate-800 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold text-white shadow-pullim-sm"
          >
            <Save className="h-4 w-4" />
            임시저장
          </button>
        }
      />

      <StepIndicator
        steps={plannerStepConfig.map(s => ({ num: s.num, label: s.label, icon: s.icon }))}
        current={currentStep}
        onJump={jumpTo}
      />

      <section className="bg-card rounded-2xl border p-5 lg:p-6">
        <header className="mb-4 flex items-start gap-3 border-b pb-4">
          <div className="bg-pullim-blue-50 text-pullim-blue-700 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <StepIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-pullim-slate-500 text-[10px] font-bold tracking-wider uppercase">
              Step {currentStep} / 8
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
          {currentStep === 5 && <PStep5Weakness form={form} setForm={setForm} />}
          {currentStep === 6 && <PStep6Motivation form={form} setForm={setForm} />}
          {currentStep === 7 && <PStep7Reminder form={form} setForm={setForm} />}
          {currentStep === 8 && <PStep8Activate form={form} mode="create" onActivate={handleActivate} />}
        </div>

        <footer className="mt-5 flex items-center justify-between border-t pt-4">
          <button
            type="button"
            onClick={goPrev}
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
            {currentStep}/8 — {stepInfo.label}
          </div>

          {canNext ? (
            <button
              type="button"
              onClick={goNext}
              className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-pullim-sm"
            >
              다음
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <span className="text-pullim-slate-500 text-[11px] font-semibold">
              ↑ 위 [플래너 활성화] 클릭으로 완료
            </span>
          )}
        </footer>
      </section>

      <FlywheelNote>
        설정한 가중치·약점·블록 패턴은 <strong>풀림 분석</strong>의 신규 진단 결과를 반영해
        매주 자동 보정돼요. 활성화 후엔 일간/주간 캘린더에서 실시간 진행률을 확인할 수 있어요.
      </FlywheelNote>
    </div>
  );
}

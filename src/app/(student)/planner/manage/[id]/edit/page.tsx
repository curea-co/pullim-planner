'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Wrench, ChevronLeft, ChevronRight, Save, Palette, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/shell/page-header';
import { FlywheelNote } from '@/components/shell/flywheel-note';
import { StepIndicator } from '@/components/builder/step-indicator';
import {
  PStep1Goal, PStep2Hours, PStep3Subjects, PStep4Pattern,
  PStep5Weakness, PStep6Motivation, PStep7Reminder, PStep8Activate,
} from '@/components/planner-builder/step-content';
import {
  plannerStepConfig, plannerToForm, formToPlannerPatch,
  type PlannerForm,
} from '@/components/planner-builder/builder-types';
import { DecorateSection } from '@/components/planner-manage/decorate-section';
import { findPlanner, updatePlanner } from '@/lib/mock';
import { cn } from '@/lib/utils';

type EditTab = 'config' | 'layout';

/**
 * 기존 시간표 수정 — 빌더 with pre-fill (mode='edit').
 * 활성화 단계의 버튼 라벨이 "변경 사항 저장"으로 변경.
 *
 * Next 16: dynamic params는 Promise. `use()` hook으로 unwrap.
 */
export default function PlannerEditPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id } = use(params);
  const planner = findPlanner(id);

  const initialTab: EditTab = searchParams.get('tab') === 'layout' ? 'layout' : 'config';
  const [tab, setTab] = useState<EditTab>(initialTab);
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<PlannerForm>(() =>
    planner ? plannerToForm(planner) : ({} as PlannerForm),
  );

  if (!planner) {
    return (
      <div className="bg-card rounded-2xl border p-8 text-center">
        <h2 className="text-pullim-slate-900 text-base font-bold">시간표를 찾을 수 없어요</h2>
        <p className="text-pullim-slate-500 mt-1 text-xs">삭제됐거나 잘못된 주소예요.</p>
        <Link
          href="/planner/manage"
          className="bg-pullim-blue-600 hover:bg-pullim-blue-700 mt-4 inline-flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-bold text-white"
        >
          시간표 관리로 돌아가기
        </Link>
      </div>
    );
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
  function jumpTo(n: number) { setCurrentStep(n); }
  function saveDraft() {
    toast.info('💾 임시저장 (데모)', {
      description: `${form.examName || planner!.name} · ${currentStep}/8단계까지 작성됨`,
    });
  }

  function handleSave(submitted: PlannerForm) {
    updatePlanner(id, formToPlannerPatch(submitted));
    toast.success('✓ 변경 사항 저장 완료', {
      description: `${submitted.examName} — 다음 활성화 시 반영됩니다`,
      duration: 3000,
    });
    router.push('/planner/manage');
  }

  const StepIcon = stepInfo.icon;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={{ icon: Wrench, text: '시간표 수정' }}
        title={`${planner.name} 수정하기`}
        description={tab === 'config'
          ? '기존 설정 그대로 불러왔어요. 변경 후 마지막 단계에서 [변경 사항 저장] 클릭.'
          : '레이아웃과 색상 팔레트를 골라 시간표를 내 스타일로.'}
        action={tab === 'config' ? (
          <button
            type="button"
            onClick={saveDraft}
            className="bg-pullim-slate-900 hover:bg-pullim-slate-800 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold text-white shadow-pullim-sm"
          >
            <Save className="h-4 w-4" />
            임시저장
          </button>
        ) : undefined}
      />

      {/* 탭 — 설정(8단계 위저드) / 꾸미기(레이아웃·팔레트) */}
      <nav role="tablist" aria-label="시간표 수정 모드" className="inline-flex rounded-xl border border-pullim-slate-200 bg-pullim-slate-50 p-1">
        {(['config', 'layout'] as const).map(t => {
          const isCurrent = tab === t;
          const Icon = t === 'config' ? ListChecks : Palette;
          const label = t === 'config' ? '설정 (8단계)' : '꾸미기';
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={isCurrent}
              onClick={() => setTab(t)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-bold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500',
                isCurrent
                  ? 'bg-card text-pullim-blue-700 shadow-sm'
                  : 'text-pullim-slate-600 hover:text-pullim-slate-900',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </nav>

      {tab === 'config' ? (
        <>
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
              {currentStep === 8 && <PStep8Activate form={form} mode="edit" onActivate={handleSave} />}
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

              <div className="text-pullim-slate-400 hidden sm:block text-[10px] font-mono">
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
                  ↑ 위 [변경 사항 저장] 클릭으로 완료
                </span>
              )}
            </footer>
          </section>

          <FlywheelNote>
            설정 변경은 활성화 시점부터 반영돼요. 활성 시간표를 바꾸지 않은 상태로 저장만 하면 다음 활성화 때 반영됩니다.
          </FlywheelNote>
        </>
      ) : (
        <DecorateSection
          planners={[planner]}
          initialPlannerId={planner.id}
          hideHeader
        />
      )}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { Palette, ListChecks } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { FlywheelNote } from '@/components/shell/flywheel-note';
import type { PlannerForm, ScopeState } from '@/components/features/planner-builder/components/builder-types';
import { hasCustomBasics, plannerStepConfig } from '@/components/features/planner-builder/components/builder-types';
import type { Planner, Routine } from '@/lib/mock';
import type { PreviewDay } from '@/lib/planner/preview-map';
import { PlannerWizard } from '../components/planner-wizard';
import { DecorateSection } from '../components/decorate-section';
import type { EditTab } from '../containers/EditPlannerContainer';
import { cn } from '@/lib/utils';

interface EditPlannerPresenterProps {
  planner: Planner | null;
  tab: EditTab;
  onTabChange: (tab: EditTab) => void;
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
  onSave: (submitted: PlannerForm) => void;
  routines?: Routine[];
  onServerPreview?: () => Promise<PreviewDay[] | null>;
  onUpdateRoutine?: (routineId: string, patch: { startTime: string; endTime: string }) => Promise<void>;
}

export default function EditPlannerPresenter({
  planner, tab, onTabChange,
  form, setForm,
  scope, setScope,
  currentStep, canPrev, canNext, blockedReason, maxReachable,
  onPrev, onNext, onJump,
  onSave,
  routines, onServerPreview, onUpdateRoutine,
}: EditPlannerPresenterProps) {
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

  return (
    <div className="space-y-5">
      {/* 임시저장 버튼 숨김(soft-open) — 서버 draft BE·영속 API 미구현이라 데모 토스트만 떠서
          "저장됐다" 오해를 유발. 리포트·약점과 동일 원칙. BE draft 준비 시 복원. */}
      <PageHeader
        title={`${planner.name} 수정하기`}
        description={tab === 'config'
          ? '기존 설정 그대로 불러왔어요. 변경 후 마지막 단계에서 [변경 사항 저장] 클릭.'
          : '레이아웃과 색상 팔레트를 골라 시간표를 내 스타일로.'}
      />

      <nav role="tablist" aria-label="시간표 수정 모드" className="inline-flex rounded-xl border border-pullim-slate-200 bg-pullim-slate-50 p-1">
        {(['config', 'layout'] as const).map(t => {
          const isCurrent = tab === t;
          const Icon = t === 'config' ? ListChecks : Palette;
          // 단계 수는 게이트에 따라 달라지므로 실제 config 길이 사용(하드코딩 금지)
          const label = t === 'config' ? `설정 (${plannerStepConfig.length}단계)` : '꾸미기';
          return (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={isCurrent}
              onClick={() => onTabChange(t)}
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
            mode="edit"
            onActivate={onSave}
            // 만들 때 넣은 값(시험명·다짐)이 있으면 1단계에서 접어 두지 않는다 —
            // 고칠 때 안 보이면 유실된 것과 다름없다.
            initialExpert={hasCustomBasics(form)}
            routines={routines}
            onServerPreview={onServerPreview}
            onUpdateRoutine={onUpdateRoutine}
          />

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

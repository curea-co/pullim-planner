'use client';

import type { ActivateSummary } from '@/components/features/planner-builder/components/step-content';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { StepIndicator } from '@/components/features/planner-builder/components/step-indicator';
import {
  PStep1Goal, PStep2Hours, PStep4Confirm,
} from '@/components/features/planner-builder/components/step-content';
import { PStep3Subjects } from '@/components/features/planner-builder/components/step-scope';
import {
  plannerStepConfig, type PlannerForm, type ScopeState,
} from '@/components/features/planner-builder/components/builder-types';
import type { Routine } from '@/lib/mock';
import type { PreviewDay } from '@/lib/planner/preview-map';
import { cn } from '@/lib/utils';

/**
 * 위저드 마크업 — new/edit 페이지 공유.
 * 상태/이벤트는 props로 받기만 (presentation). 펼침 상태(`expert`)만 이 컴포넌트가 들고 있다
 * (단계를 오가도 유지돼야 하는 표시 상태이지 저장 대상이 아니라서).
 *
 * **`expert` 는 1단계 전용 개념이다** — 여는 것도, 토글이 놓이는 자리도 1단계 본문뿐.
 * 헤더 우측 고정 자리에 두면 2·3·4단계에서 아무것도 열지 않는 죽은 버튼이 된다.
 * 4단계 조정 패널의 알림·약점은 각자의 기능 플래그로만 노출한다 — 여기 묶어 두면
 * 플래그를 켠 환경에서 그 설정들이 4단계에서 사라진 것처럼 보인다(Codex).
 */
interface PlannerWizardProps {
  form: PlannerForm;
  setForm: (f: PlannerForm | ((prev: PlannerForm) => PlannerForm)) => void;
  /** 학습 범위 확인 게이트 상태 */
  scope: ScopeState;
  setScope: (s: ScopeState | ((prev: ScopeState) => ScopeState)) => void;
  currentStep: number;
  canPrev: boolean;
  canNext: boolean;
  /** 현재 단계에서 다음으로 못 가는 이유 — 없으면 null */
  blockedReason: string | null;
  /** 지금 갈 수 있는 가장 뒤 단계 */
  maxReachable: number;
  onPrev: () => void;
  onNext: () => void;
  onJump: (n: number) => void;
  mode: 'create' | 'edit';
  onActivate: (submitted: PlannerForm, summary?: ActivateSummary) => void;
  /** 1단계 '시험명·다짐 직접 쓰기'를 처음부터 펼친 채로 시작 — 기존 값이 숨겨지지 않게(수정 모드) */
  initialExpert?: boolean;
  /** 실 루틴(컨테이너 fetch) — 4단계 조정·미리보기에 사용. 미주입 시 mock. */
  routines?: Routine[];
  /** 4단계 서버 dry-run 미리보기 로더(컨테이너 주입) — 미주입 시 휴리스틱. */
  onServerPreview?: () => Promise<PreviewDay[] | null>;
  /** 루틴 원본 시각 수정 — 4단계 충돌 배너의 '옮기기' 조치용. */
  onUpdateRoutine?: (routineId: string, patch: { startTime: string; endTime: string }) => Promise<void>;
}

export function PlannerWizard({
  form, setForm,
  scope, setScope,
  currentStep, canPrev, canNext, blockedReason, maxReachable,
  onPrev, onNext, onJump,
  mode, onActivate,
  initialExpert,
  routines, onServerPreview, onUpdateRoutine,
}: PlannerWizardProps) {
  const stepInfo = plannerStepConfig[currentStep - 1];
  const StepIcon = stepInfo.icon;
  // 축소는 최소 경로를 만드는 것이지 유일 경로로 만드는 게 아니다 — 뺀 설정을 여기서 되돌려 받는다.
  const [expert, setExpert] = useState(initialExpert ?? false);

  return (
    <>
      <StepIndicator
        steps={plannerStepConfig.map(s => ({ num: s.num, label: s.label, icon: s.icon }))}
        current={currentStep}
        maxReachable={maxReachable}
        onJump={onJump}
      />

      <section className="bg-card rounded-2xl border p-5 lg:p-6">
        <header className="mb-4 flex items-start gap-3 border-b pb-4">
          <div className="bg-pullim-blue-50 text-pullim-blue-700 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <StepIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-pullim-slate-500 text-[10px] font-bold tracking-wider uppercase">
              Step {currentStep} / {plannerStepConfig.length}
            </div>
            <h2 className="text-pullim-slate-900 mt-0.5 text-lg font-bold tracking-tight">
              {stepInfo.title}
            </h2>
            {stepInfo.description && (
              <p className="text-pullim-slate-600 mt-1 text-xs leading-relaxed">
                {stepInfo.description}
              </p>
            )}
          </div>
        </header>

        <div className="min-h-[280px]">
          {/* 단계 번호가 아니라 key로 렌더 — 구성이 바뀌어도 안전 */}
          {stepInfo.key === 'goal'     && <PStep1Goal form={form} setForm={setForm} expert={expert} onExpertChange={setExpert} />}
          {stepInfo.key === 'hours'    && <PStep2Hours form={form} setForm={setForm} />}
          {stepInfo.key === 'subjects' && <PStep3Subjects form={form} setForm={setForm} scope={scope} setScope={setScope} />}
          {stepInfo.key === 'activate' && (
            <PStep4Confirm
              form={form}
              setForm={setForm}
              scope={scope}
              mode={mode}
              onActivate={onActivate}
              routines={routines}
              onServerPreview={onServerPreview}
              onUpdateRoutine={onUpdateRoutine}
            />
          )}
        </div>

        <footer className="mt-5 flex items-center justify-between gap-2 border-t pt-4">
          <button
            type="button"
            onClick={onPrev}
            disabled={!canPrev}
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-xl px-4 py-2 text-sm font-bold transition-colors',
              canPrev
                ? 'bg-pullim-slate-100 text-pullim-slate-700 hover:bg-pullim-slate-200'
                : 'bg-pullim-slate-50 text-pullim-slate-300 cursor-not-allowed',
            )}
          >
            <ChevronLeft className="h-4 w-4" />
            이전
          </button>

          {/* 막힌 이유는 숨기지 않는다 — 무엇을 더 해야 넘어가는지 그 자리에서 보여준다 */}
          {blockedReason ? (
            <p className="text-pullim-danger min-w-0 text-center text-[11px] font-semibold">
              {blockedReason}
            </p>
          ) : (
            <div className="text-pullim-slate-500 hidden font-mono text-[10px] sm:block">
              {currentStep}/{plannerStepConfig.length} — {stepInfo.label}
            </div>
          )}

          {canNext ? (
            <button
              type="button"
              onClick={onNext}
              className={cn(
                'inline-flex shrink-0 items-center gap-1 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-pullim-sm transition-colors',
                blockedReason
                  ? 'bg-pullim-slate-300 hover:bg-pullim-slate-400'
                  : 'bg-pullim-blue-600 hover:bg-pullim-blue-700',
              )}
            >
              다음
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : null}
        </footer>
      </section>
    </>
  );
}

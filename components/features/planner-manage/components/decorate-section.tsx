'use client';

/**
 * 시간표 꾸미기 — 레이아웃 템플릿 + 색상 팔레트.
 *
 * 좌(미리보기) / 우(컨트롤). 상단 플래너 picker로 어떤 시간표를 꾸밀지 전환.
 * 활성/비활성 모두 편집 가능. 미리보기는 활성 플래너의 실제 todayBlocks를 사용해 스타일만 swap.
 */

import { useMemo, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Palette as PaletteIcon, Sparkles, RotateCcw, Save, CheckCircle2, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import {
  todayBlocks,
  palettes,
  paletteOrder,
  layoutTemplates,
  layoutOrder,
  weekLayouts,
  weekLayoutOrder,
  type Planner,
  type PaletteId,
  type LayoutTemplateId,
  type WeekLayoutId,
} from '@/lib/mock';
import { plannerClient } from '@/lib/planner/client';
import { updatePlannerCustomization } from '@/lib/mock/planner';
import {
  getCustomization,
  type Customization,
} from '@/lib/hooks/use-planner-customization';
import { ActiveDayLayout } from '@/components/features/planner-home/components/layouts/active-day-layout';
import { ActiveWeekLayout } from '@/components/features/planner-home/components/layouts/active-week-layout';
import { cn } from '@/lib/utils';

const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1';

type PreviewTab = 'day' | 'week';

export type DecorateSectionHandle = {
  /** 특정 플래너로 컨텍스트 전환 + 섹션으로 스크롤 */
  focusPlanner: (plannerId: string) => void;
};

type Props = {
  /** 편집 후보 플래너 목록 — 활성 + 비활성 + 아카이브 */
  planners: Planner[];
  /** 초기 선택 plannerId (보통 활성 플래너) */
  initialPlannerId: string;
  /** 저장 완료 후 콜백 (manage 페이지 refresh 트리거 등) */
  onSaved?: (plannerId: string) => void;
  /** 섹션 내부 헤더 숨김 — 빌더 페이지처럼 외부 PageHeader가 이미 설명을 제공할 때 사용 */
  hideHeader?: boolean;
};

export const DecorateSection = forwardRef<DecorateSectionHandle, Props>(
  function DecorateSection({ planners, initialPlannerId, onSaved, hideHeader }, ref) {
    const sectionRef = useRef<HTMLElement>(null);
    const [selectedId, setSelectedId] = useState(initialPlannerId);

    // 외부에서 plannerId 전환 + 스크롤 명령
    useImperativeHandle(ref, () => ({
      focusPlanner: (plannerId: string) => {
        setSelectedId(plannerId);
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
    }), []);

    const selectedPlanner = useMemo(
      () => planners.find(p => p.id === selectedId) ?? null,
      [planners, selectedId],
    );
    // 저장 baseline. API 저장 후 selectedPlanner prop 은 갱신되지 않으므로(부모가 refetch 안 함),
    // 저장 성공 시 override 로 baseline 을 끌어올려 isDirty 가 false 가 되게 한다 (codex).
    const [savedOverride, setSavedOverride] = useState<Customization | null>(
      null,
    );
    const plannerSaved = useMemo(
      () => getCustomization(selectedPlanner),
      [selectedPlanner],
    );
    const saved = savedOverride ?? plannerSaved;

    // 드래프트 — 저장값을 초기값으로
    const [draftLayout, setDraftLayout] = useState<LayoutTemplateId>(saved.layoutId);
    const [draftWeekLayout, setDraftWeekLayout] = useState<WeekLayoutId>(saved.weekLayoutId);
    const [draftPalette, setDraftPalette] = useState<PaletteId>(saved.paletteId);
    const [previewTab, setPreviewTab] = useState<PreviewTab>('day');

    // 플래너 전환 시 draft·override 를 새 플래너의 저장값으로 리셋 (Adjusting state on prop changes 패턴)
    const [prevSelectedId, setPrevSelectedId] = useState(selectedId);
    if (selectedId !== prevSelectedId) {
      setPrevSelectedId(selectedId);
      setSavedOverride(null);
      setDraftLayout(plannerSaved.layoutId);
      setDraftWeekLayout(plannerSaved.weekLayoutId);
      setDraftPalette(plannerSaved.paletteId);
    }

    const isDirty =
      draftLayout !== saved.layoutId
      || draftWeekLayout !== saved.weekLayoutId
      || draftPalette !== saved.paletteId;

    function reset() {
      setDraftLayout(saved.layoutId);
      setDraftWeekLayout(saved.weekLayoutId);
      setDraftPalette(saved.paletteId);
    }

    async function save() {
      if (!selectedPlanner) return;
      const next = {
        layoutId: draftLayout,
        weekLayoutId: draftWeekLayout,
        paletteId: draftPalette,
      };
      // 저장 성공 후 공통 처리 — baseline 끌어올림(isDirty=false) + toast + 상위 알림.
      const onOk = () => {
        setSavedOverride(next);
        toast.success('🎨 시간표 꾸미기 저장됨', {
          description: `${selectedPlanner.name} — 일간 ${layoutTemplates[draftLayout].label} · 주간 ${weekLayouts[draftWeekLayout].label} · ${palettes[draftPalette].label}`,
          duration: 2500,
        });
        onSaved?.(selectedPlanner.id);
      };
      // 로컬 dev 우회 — 실 API 대신 공유 mock store를 갱신한다.
      if (DEV_AUTH_BYPASS) {
        updatePlannerCustomization(selectedPlanner.id, next);
        onOk();
        return;
      }
      try {
        await plannerClient.updateCustomization(selectedPlanner.id, next);
        onOk();
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : '꾸미기 저장 실패');
      }
    }

    if (!selectedPlanner) {
      return null;
    }

    return (
      <section
        ref={sectionRef}
        aria-label="시간표 꾸미기"
        className="bg-card rounded-2xl border p-4 space-y-4"
      >
        {!hideHeader && (
        <header className="flex items-start justify-between gap-2">
          <div>
            <p className="text-pullim-blue-600 inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
              <Sparkles className="h-3 w-3" />
              꾸미기
            </p>
            <h2 className="text-pullim-slate-900 mt-0.5 text-base font-bold tracking-tight">
              레이아웃과 색상 고르기
            </h2>
            <p className="text-pullim-slate-500 mt-0.5 text-[11px]">
              템플릿과 팔레트를 골라 시간표를 내 스타일로 — 저장 시 일간/주간 뷰에 즉시 반영
            </p>
          </div>
        </header>
        )}

        {/* 플래너 picker */}
        {planners.length > 1 && (
          <PlannerPicker
            planners={planners}
            selectedId={selectedId}
            onSelect={setSelectedId}
            isDirty={isDirty}
          />
        )}

        {/* 본문 — 미리보기 + 컨트롤 */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
          {/* 미리보기 */}
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <p className="text-pullim-slate-500 text-[10px] font-bold tracking-wider uppercase">
                미리보기
              </p>
              {/* 일간/주간 탭 */}
              <div role="tablist" aria-label="미리보기 뷰 선택" className="inline-flex rounded-lg border border-pullim-slate-200 bg-pullim-slate-50 p-0.5">
                {(['day', 'week'] as const).map(tab => {
                  const selected = previewTab === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      role="tab"
                      aria-selected={selected}
                      onClick={() => setPreviewTab(tab)}
                      className={cn(
                        'rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500',
                        selected
                          ? 'bg-card text-pullim-blue-700 shadow-sm'
                          : 'text-pullim-slate-500 hover:text-pullim-slate-700',
                      )}
                    >
                      {tab === 'day' ? '일간' : '주간'}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="bg-pullim-slate-25 border-pullim-slate-100 rounded-xl border p-3">
              {previewTab === 'day' ? (
                <ActiveDayLayout
                  blocks={todayBlocks}
                  layoutId={draftLayout}
                  paletteId={draftPalette}
                  compact
                  ddayLabel={undefined}
                />
              ) : (
                <ActiveWeekLayout
                  weekLayoutId={draftWeekLayout}
                  paletteId={draftPalette}
                  compact
                />
              )}
              <p className="text-pullim-slate-500 mt-2 text-[10px]">
                * 미리보기에는 오늘·이번 주 데모 데이터가 사용됩니다.
              </p>
            </div>
          </div>

          {/* 컨트롤 */}
          <div className="space-y-3">
            <LayoutControl value={draftLayout} onChange={setDraftLayout} />
            <WeekLayoutControl value={draftWeekLayout} onChange={setDraftWeekLayout} />
            <PaletteControl value={draftPalette} onChange={setDraftPalette} />

            {/* 저장 / 되돌리기 */}
            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={reset}
                disabled={!isDirty}
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-bold transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500',
                  isDirty
                    ? 'text-pullim-slate-700 hover:bg-pullim-slate-100'
                    : 'text-pullim-slate-300',
                )}
              >
                <RotateCcw className="h-3 w-3" />
                되돌리기
              </button>
              <button
                type="button"
                onClick={save}
                disabled={!isDirty}
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg px-3.5 py-2 text-xs font-bold text-white transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500',
                  isDirty
                    ? 'bg-pullim-blue-600 hover:bg-pullim-blue-700'
                    : 'bg-pullim-slate-300',
                )}
              >
                <Save className="h-3 w-3" />
                저장
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  },
);

function PlannerPicker({
  planners,
  selectedId,
  onSelect,
  isDirty,
}: {
  planners: Planner[];
  selectedId: string;
  onSelect: (id: string) => void;
  isDirty: boolean;
}) {
  function attemptSelect(id: string) {
    if (id === selectedId) return;
    if (isDirty) {
      const ok = window.confirm('저장하지 않은 변경이 있어요. 다른 시간표로 이동하면 사라집니다.');
      if (!ok) return;
    }
    onSelect(id);
  }

  return (
    <div>
      <p className="text-pullim-slate-500 mb-1.5 text-[10px] font-bold tracking-wider uppercase">
        어떤 시간표를 꾸밀까요?
      </p>
      <div role="tablist" aria-label="플래너 선택" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {planners.map(p => {
          const selected = p.id === selectedId;
          return (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => attemptSelect(p.id)}
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500',
                selected
                  ? 'border-pullim-blue-500 bg-pullim-blue-50 text-pullim-blue-700 ring-1 ring-pullim-blue-300'
                  : 'border-pullim-slate-200 bg-card text-pullim-slate-700 hover:border-pullim-blue-200',
                p.archived && 'opacity-65',
              )}
            >
              {p.active && <CheckCircle2 className="h-3 w-3 text-pullim-blue-600" />}
              {p.archived && <Archive className="h-3 w-3 text-pullim-slate-400" />}
              <span className="truncate max-w-[160px]">{p.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function LayoutControl({
  value,
  onChange,
}: {
  value: LayoutTemplateId;
  onChange: (id: LayoutTemplateId) => void;
}) {
  return (
    <fieldset>
      <legend className="text-pullim-slate-500 mb-1.5 text-[10px] font-bold tracking-wider uppercase">
        일간 레이아웃
      </legend>
      <div className="grid grid-cols-2 gap-1.5">
        {layoutOrder.map(id => {
          const meta = layoutTemplates[id];
          const selected = id === value;
          return (
            <label
              key={id}
              className={cn(
                'group relative flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 transition-colors',
                'focus-within:ring-2 focus-within:ring-pullim-blue-500',
                selected
                  ? 'border-pullim-blue-500 bg-pullim-blue-50/50 ring-1 ring-pullim-blue-300'
                  : 'border-pullim-slate-200 bg-card hover:border-pullim-blue-200',
              )}
            >
              <input
                type="radio"
                name="layout"
                value={id}
                checked={selected}
                onChange={() => onChange(id)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-sm',
                  selected ? 'bg-pullim-blue-600 text-white' : 'bg-pullim-slate-100 text-pullim-slate-700',
                )}
              >
                {meta.glyph}
              </span>
              <span className="min-w-0">
                <span className={cn(
                  'block text-xs font-bold',
                  selected ? 'text-pullim-blue-700' : 'text-pullim-slate-900',
                )}>
                  {meta.label}
                </span>
                <span className="text-pullim-slate-500 mt-0.5 block text-[10px] leading-tight">
                  {meta.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function WeekLayoutControl({
  value,
  onChange,
}: {
  value: WeekLayoutId;
  onChange: (id: WeekLayoutId) => void;
}) {
  return (
    <fieldset>
      <legend className="text-pullim-slate-500 mb-1.5 text-[10px] font-bold tracking-wider uppercase">
        주간 레이아웃
      </legend>
      <div className="grid grid-cols-2 gap-1.5">
        {weekLayoutOrder.map(id => {
          const meta = weekLayouts[id];
          const selected = id === value;
          return (
            <label
              key={id}
              className={cn(
                'group relative flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 transition-colors',
                'focus-within:ring-2 focus-within:ring-pullim-blue-500',
                selected
                  ? 'border-pullim-blue-500 bg-pullim-blue-50/50 ring-1 ring-pullim-blue-300'
                  : 'border-pullim-slate-200 bg-card hover:border-pullim-blue-200',
              )}
            >
              <input
                type="radio"
                name="week-layout"
                value={id}
                checked={selected}
                onChange={() => onChange(id)}
                className="sr-only"
              />
              <span
                aria-hidden
                className={cn(
                  'mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-mono text-sm',
                  selected ? 'bg-pullim-blue-600 text-white' : 'bg-pullim-slate-100 text-pullim-slate-700',
                )}
              >
                {meta.glyph}
              </span>
              <span className="min-w-0">
                <span className={cn(
                  'block text-xs font-bold',
                  selected ? 'text-pullim-blue-700' : 'text-pullim-slate-900',
                )}>
                  {meta.label}
                </span>
                <span className="text-pullim-slate-500 mt-0.5 block text-[10px] leading-tight">
                  {meta.description}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function PaletteControl({
  value,
  onChange,
}: {
  value: PaletteId;
  onChange: (id: PaletteId) => void;
}) {
  return (
    <fieldset>
      <legend className="text-pullim-slate-500 mb-1.5 inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
        <PaletteIcon className="h-3 w-3" />
        색상 팔레트
      </legend>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-1.5">
        {paletteOrder.map(id => {
          const palette = palettes[id];
          const selected = id === value;
          // 대표 색 4개 미리보기 (concept, mock, self_explain, break)
          const dots = ['concept', 'mock', 'self_explain', 'break'] as const;
          return (
            <label
              key={id}
              className={cn(
                'group flex cursor-pointer items-center gap-2 rounded-lg border p-2 transition-colors',
                'focus-within:ring-2 focus-within:ring-pullim-blue-500',
                selected
                  ? 'border-pullim-blue-500 bg-pullim-blue-50/50 ring-1 ring-pullim-blue-300'
                  : 'border-pullim-slate-200 bg-card hover:border-pullim-blue-200',
              )}
            >
              <input
                type="radio"
                name="palette"
                value={id}
                checked={selected}
                onChange={() => onChange(id)}
                className="sr-only"
              />
              <span aria-hidden className="flex shrink-0 items-center -space-x-0.5">
                {dots.map(d => (
                  <span
                    key={d}
                    className="inline-block h-3.5 w-3.5 rounded-full ring-1 ring-white"
                    style={{ background: palette.block[d] }}
                  />
                ))}
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn(
                  'block truncate text-[11px] font-bold',
                  selected ? 'text-pullim-blue-700' : 'text-pullim-slate-900',
                )}>
                  {palette.emoji} {palette.label}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}


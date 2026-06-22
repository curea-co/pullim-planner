'use client';

import type { ReactNode } from 'react';
import {
  CalendarClock, CalendarRange, Grid3x3, ChevronLeft, ChevronRight, type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { cn } from '@/lib/utils';

export type CalendarView = 'day' | 'week' | 'month';

type ViewMeta = {
  label: string;
  icon: LucideIcon;
  /** 헤더 eyebrow 텍스트 */
  eyebrow: string;
  /** 시간 이동 단위 */
  navUnit: '하루' | '주' | '월';
};

const viewMeta: Record<CalendarView, ViewMeta> = {
  day:   { label: '일간', icon: CalendarClock, eyebrow: '일간 캘린더', navUnit: '하루' },
  week:  { label: '주간', icon: CalendarRange, eyebrow: '주간 캘린더', navUnit: '주' },
  month: { label: '월간', icon: Grid3x3,       eyebrow: '월간 캘린더', navUnit: '월' },
};

type Props = {
  view: CalendarView;
  onChangeView: (view: CalendarView) => void;
  /** 헤더 제목 (view에 따라 다름) */
  title: ReactNode;
  /** 헤더 부제 (view에 따라 다름) */
  description?: ReactNode;
  /** prev/next 버튼 사이의 라벨 (예: "2026.04 · 4주차") */
  navLabel: ReactNode;
  /** 좌측 prev 버튼 라벨 (선택) */
  prevLabel?: string;
  /** 우측 next 버튼 라벨 (선택) */
  nextLabel?: string;
  /** prev/next 클릭 핸들러. 미전달 시 버튼 disabled. */
  onPrev?: () => void;
  onNext?: () => void;
  /** 추가 우측 액션 (예: '오늘로' 버튼) */
  action?: ReactNode;
  /** view 본문 */
  children: ReactNode;
};

/**
 * 캘린더 통합 shell — 일·주·월 토글 + 시간 이동 + 헤더 + 본문 슬롯.
 * view-specific 본문은 children으로 주입 (`<DayView />` 등).
 */
export function CalendarShell({
  view, onChangeView,
  title, description, navLabel,
  prevLabel, nextLabel, onPrev, onNext, action,
  children,
}: Props) {
  const meta = viewMeta[view];

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow={{ icon: meta.icon, text: meta.eyebrow }}
        title={title}
        description={description}
        action={action}
      />

      {/* View 토글 + 시간 이동 — sm 이상 한 줄, mobile은 2줄 */}
      <div className="bg-card flex flex-wrap items-center gap-2 rounded-xl border p-2">
        <ViewToggle view={view} onChange={onChangeView} />

        <div className="border-pullim-slate-200 flex w-full items-center justify-end gap-1 sm:ml-auto sm:w-auto sm:border-l sm:pl-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={!onPrev}
            aria-label={prevLabel ?? `이전 ${meta.navUnit}`}
            className="hover:bg-pullim-slate-50 disabled:cursor-not-allowed disabled:opacity-40 inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{prevLabel ?? `이전 ${meta.navUnit}`}</span>
          </button>
          <span className="text-pullim-slate-700 px-2 text-xs font-bold">
            {navLabel}
          </span>
          <button
            type="button"
            onClick={onNext}
            disabled={!onNext}
            aria-label={nextLabel ?? `다음 ${meta.navUnit}`}
            className="hover:bg-pullim-slate-50 disabled:cursor-not-allowed disabled:opacity-40 inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold"
          >
            <span className="hidden sm:inline">{nextLabel ?? `다음 ${meta.navUnit}`}</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {children}
    </div>
  );
}

function ViewToggle({ view, onChange }: { view: CalendarView; onChange: (v: CalendarView) => void }) {
  return (
    <div role="tablist" aria-label="캘린더 보기" className="bg-pullim-slate-100 inline-flex items-center gap-0.5 rounded-lg p-0.5">
      {(['day', 'week', 'month'] as const).map(v => {
        const m = viewMeta[v];
        const Icon = m.icon;
        const selected = view === v;
        return (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(v)}
            className={cn(
              'inline-flex items-center gap-1 rounded-md px-2.5 py-2 text-xs font-bold transition-colors',
              selected
                ? 'bg-card text-pullim-blue-700 shadow-pullim-sm'
                : 'text-pullim-slate-500 hover:text-pullim-slate-700',
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}

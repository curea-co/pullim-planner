'use client';

import type { ReactNode } from 'react';
import {
  CalendarClock, CalendarRange, Grid3x3,
  type LucideIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { cn } from '@/lib/utils';

export type ReportsView = 'day' | 'week' | 'month';

type ViewMeta = {
  label: string;
  icon: LucideIcon;
};

const viewMeta: Record<ReportsView, ViewMeta> = {
  day:   { label: '일간', icon: CalendarClock },
  week:  { label: '주간', icon: CalendarRange },
  month: { label: '월간', icon: Grid3x3 },
};

type Props = {
  view: ReportsView;
  onChangeView: (v: ReportsView) => void;
  /** 헤더 description (view에 따라 다름) */
  description: ReactNode;
  /** 헤더 우측 액션 — "부모님께 보내기" 등 */
  action?: ReactNode;
  children: ReactNode;
};

const titleByView: Record<ReportsView, string> = {
  day:   '오늘의 회고',
  week:  '성장 리포트',
  month: '이번 달 회고',
};

/**
 * Reports 통합 셸 — 일/주/월 토글 + 헤더 + 본문 슬롯.
 * calendar-shell과 비슷하지만 *시간 이동 페이저* 없이 *현재 시점만* 다룬다.
 */
export function ReportsShell({ view, onChangeView, description, action, children }: Props) {
  return (
    <div className="space-y-4">
      <PageHeader
        title={titleByView[view]}
        description={description}
        action={action}
      />

      <div className="bg-card flex flex-wrap items-center gap-2 rounded-xl border p-2">
        <ViewToggle view={view} onChange={onChangeView} />
      </div>

      {children}
    </div>
  );
}

function ViewToggle({ view, onChange }: { view: ReportsView; onChange: (v: ReportsView) => void }) {
  return (
    <div role="tablist" aria-label="리포트 보기" className="bg-pullim-slate-100 inline-flex items-center gap-0.5 rounded-lg p-0.5">
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
              'inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-bold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500',
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

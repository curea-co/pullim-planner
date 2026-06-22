'use client';

import { toast } from 'sonner';
import { weeklyInsights, type WeeklyInsight } from '@/lib/mock';
import { cn } from '@/lib/utils';

const toneClass: Record<WeeklyInsight['tone'], string> = {
  good: 'bg-pullim-success-bg/30 border-pullim-success/30',
  warn: 'bg-pullim-warn-bg/40 border-pullim-warn/30',
  info: 'bg-pullim-blue-50/40 border-pullim-blue-200',
};

/**
 * 주간 인사이트 카드 그리드 — 11-planner-design § 6.1.
 * weekly-summary 상단에 3~5개 자동 인사이트 노출.
 * "데이터 덤프" 대신 한 줄 멘트 + 액션 칩.
 */
export function WeeklyInsights() {
  function onAction(insight: WeeklyInsight) {
    const a = insight.action;
    if (!a) return;
    switch (a.kind) {
      case 'adjust_schedule':
        toast.info('시간표 조정', { description: '시간표 빌더로 이동…', duration: 2500 });
        break;
      case 'reduce_block':
        toast.success('블록 축소 예약', { description: '내일 1블록을 자동 이월할게요.', duration: 2500 });
        break;
      case 'review_weak':
        toast.info('약점 복습', { description: '약점 단원 정복 큐로 이동…', duration: 2500 });
        break;
      case 'celebrate':
        toast.success('잘하고 있어요!', { duration: 2500 });
        break;
    }
  }

  return (
    <section aria-label="이번 주 인사이트" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {weeklyInsights.map((insight, i) => (
        <article
          key={i}
          className={cn(
            'flex items-start gap-2 rounded-xl border px-3 py-2.5',
            toneClass[insight.tone],
          )}
        >
          <span aria-hidden className="shrink-0 text-base leading-none">{insight.emoji}</span>
          <p className="text-pullim-slate-900 flex-1 text-xs font-semibold leading-snug">
            {insight.headline}
          </p>
          {insight.action && (
            <button
              type="button"
              onClick={() => onAction(insight)}
              className="bg-card hover:bg-pullim-blue-50 text-pullim-blue-700 shrink-0 rounded-md border px-2 py-1 text-[11px] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
            >
              {insight.action.label}
            </button>
          )}
        </article>
      ))}
    </section>
  );
}

import { monthView } from '@/lib/mock';
import { MonthHeatmap } from '@/components/features/planner-home/components/month-heatmap';
import { MonthlyProgressCard } from '@/components/planner/home/monthly-progress-card';

/**
 * 월간 시간표 본문 — 좌측 히트맵, 우측 해당 월 달성률 통합 카드.
 * day-view·week-view와 동일 grid (xl:grid-cols-[420px_1fr])로 일관 IA.
 */
export function MonthView() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]">
      <MonthHeatmap />
      <MonthlyProgressCard />
    </div>
  );
}

/** 월간 메타 */
export function getMonthMeta() {
  const totalBlocks = monthView.reduce((s, d) => s + d.blockCount, 0);
  return { totalBlocks };
}

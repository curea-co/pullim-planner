'use client';

import { weekView } from '@/lib/mock';
import { ActiveWeekLayout } from '@/components/planner/layouts/active-week-layout';
import { WeeklyChart } from '@/components/planner/weekly-chart';
import { WeeklyGoalsCard } from '@/components/planner/home/weekly-goals-card';
import { getActiveCustomization } from '@/lib/hooks/use-planner-customization';

/**
 * 주간 시간표 본문 — 좌측 시간표, 우측 주간 달성 목표.
 * day-view와 동일 grid (xl:grid-cols-[420px_1fr])로 일관 IA.
 *
 * 활성 플래너의 `weekLayoutId`에 따라 4종 주간 레이아웃 중 하나 렌더.
 * bar_week 레이아웃 선택 시 하단 WeeklyChart는 중복이라 숨김.
 */
export function WeekView() {
  const { weekLayoutId, paletteId } = getActiveCustomization();
  const isBarWeek = weekLayoutId === 'bar_week';

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]">
      <div className="space-y-4">
        <ActiveWeekLayout weekLayoutId={weekLayoutId} paletteId={paletteId} />
        {!isBarWeek && <WeeklyChart />}
      </div>
      <WeeklyGoalsCard />
    </div>
  );
}

/** 주간 메타 — calendar-shell이 헤더에 표시하는 통계 */
export function getWeekMeta() {
  const totalMinutes = weekView.reduce((s, d) => s + d.totalMinutes, 0);
  const completedMinutes = weekView.reduce((s, d) => s + d.totalMinutes * d.completionPct / 100, 0);
  const todayIdx = weekView.findIndex(d => d.isToday);
  return {
    totalHours: Math.round(totalMinutes / 60 * 10) / 10,
    completedHours: Math.round(completedMinutes / 60 * 10) / 10,
    todayIdx,
  };
}

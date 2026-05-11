import { weekView } from '@/lib/mock';
import { WeekGrid } from '@/components/planner/week-grid';
import { WeeklyChart } from '@/components/planner/weekly-chart';
import { WeeklyGoalsCard } from '@/components/planner/home/weekly-goals-card';

/**
 * 주간 시간표 본문 — 좌측 시간표, 우측 주간 달성 목표.
 * day-view와 동일 grid (xl:grid-cols-[420px_1fr])로 일관 IA.
 */
export function WeekView() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]">
      <div className="space-y-4">
        <WeekGrid />
        <WeeklyChart />
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

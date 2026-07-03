'use client';

import { weekView, type WeekDay } from '@/lib/mock';
import { ActiveWeekLayout } from '@/components/features/planner-home/components/layouts/active-week-layout';
import { WeeklyChart } from '@/components/features/planner-home/components/weekly-chart';
import { WeeklyGoalsCard } from '@/components/features/planner-home/components/home/weekly-goals-card';
import { PeriodEmptyState } from '@/components/features/planner-home/components/period-empty-state';
import { getActiveCustomization } from '@/lib/hooks/use-planner-customization';

interface WeekViewProps {
  /** 주 이동 offset (0=기준 주). 0 외에는 데모 플랜이 없어 빈 상태. */
  weekOffset?: number;
  /** 빈 상태에서 기준 주로 리셋 */
  onReset?: () => void;
  /** 실데이터(B4) — 주입 시 그 주의 실 집계로 렌더(offset 이동도 실데이터). 미주입=mock 데모. */
  days?: WeekDay[];
}

/**
 * 주간 시간표 본문 — 좌측 시간표, 우측 주간 달성 목표.
 * day-view와 동일 grid (xl:grid-cols-[420px_1fr])로 일관 IA.
 *
 * 활성 플래너의 `weekLayoutId`에 따라 4종 주간 레이아웃 중 하나 렌더.
 * bar_week 레이아웃 선택 시 하단 WeeklyChart는 중복이라 숨김.
 * 실데이터 모드(days 주입)에선 WeeklyChart·WeeklyGoalsCard 를 숨긴다 —
 * 목표시간·정답률·약점은 블록 외 mock 이라 실 수치로 오도하지 않기 위함(B4b 에서 실 표면 연동).
 */
export function WeekView({ weekOffset = 0, onReset, days }: WeekViewProps) {
  const { weekLayoutId, paletteId } = getActiveCustomization();
  const isBarWeek = weekLayoutId === 'bar_week';
  const isReal = days !== undefined;

  // 실데이터: 그 주에 블록이 하나도 없으면 빈 상태. mock 데모: 기준 주 외 빈 상태.
  if (isReal ? days.every(d => d.totalMinutes === 0) : weekOffset !== 0) {
    return <PeriodEmptyState message="이 주엔 아직 계획이 없어요" onReset={onReset} resetLabel="이번 주 보기" />;
  }

  return (
    <div className={isReal ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]'}>
      <div className="space-y-4">
        <ActiveWeekLayout weekLayoutId={weekLayoutId} paletteId={paletteId} days={days} />
        {!isBarWeek && !isReal && <WeeklyChart />}
      </div>
      {!isReal && <WeeklyGoalsCard />}
    </div>
  );
}

/** 주간 메타 — calendar-shell이 헤더에 표시하는 통계. offset≠0은 빈 통계. */
export function getWeekMeta(weekOffset = 0) {
  if (weekOffset !== 0) return { totalHours: 0, completedHours: 0, todayIdx: -1 };
  const totalMinutes = weekView.reduce((s, d) => s + d.totalMinutes, 0);
  const completedMinutes = weekView.reduce((s, d) => s + d.totalMinutes * d.completionPct / 100, 0);
  const todayIdx = weekView.findIndex(d => d.isToday);
  return {
    totalHours: Math.round(totalMinutes / 60 * 10) / 10,
    completedHours: Math.round(completedMinutes / 60 * 10) / 10,
    todayIdx,
  };
}

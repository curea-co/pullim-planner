import { monthView } from '@/lib/mock';
import { MonthHeatmap } from '@/components/features/planner-home/components/month-heatmap';
import { MonthlyProgressCard } from '@/components/features/planner-home/components/home/monthly-progress-card';
import { PeriodEmptyState } from '@/components/features/planner-home/components/period-empty-state';

interface MonthViewProps {
  /** 월 이동 offset (0=기준 월). 0 외에는 데모 플랜이 없어 빈 상태. */
  monthOffset?: number;
  /** 빈 상태에서 기준 월로 리셋 */
  onReset?: () => void;
}

/**
 * 월간 시간표 본문 — 좌측 히트맵, 우측 해당 월 달성률 통합 카드.
 * day-view·week-view와 동일 grid (xl:grid-cols-[420px_1fr])로 일관 IA.
 */
export function MonthView({ monthOffset = 0, onReset }: MonthViewProps) {
  // 기준 월 외에는 데모 데이터가 없어 빈 상태. BE 연동 시 그 달 데이터로 대체.
  if (monthOffset !== 0) {
    return <PeriodEmptyState message="이 달엔 아직 계획이 없어요" onReset={onReset} resetLabel="이번 달 보기" />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]">
      <MonthHeatmap />
      <MonthlyProgressCard />
    </div>
  );
}

/** 월간 메타. offset≠0은 빈 통계. */
export function getMonthMeta(monthOffset = 0) {
  if (monthOffset !== 0) return { totalBlocks: 0 };
  const totalBlocks = monthView.reduce((s, d) => s + d.blockCount, 0);
  return { totalBlocks };
}

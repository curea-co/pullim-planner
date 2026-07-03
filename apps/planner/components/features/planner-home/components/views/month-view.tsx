import { monthView, type MonthDay } from '@/lib/mock';
import { MonthHeatmap } from '@/components/features/planner-home/components/month-heatmap';
import { MonthlyProgressCard } from '@/components/features/planner-home/components/home/monthly-progress-card';
import { PeriodEmptyState } from '@/components/features/planner-home/components/period-empty-state';

interface MonthViewProps {
  /** 월 이동 offset (0=기준 월). 0 외에는 데모 플랜이 없어 빈 상태. */
  monthOffset?: number;
  /** 빈 상태에서 기준 월로 리셋 */
  onReset?: () => void;
  /** 실데이터(B4) — 주입 시 그 달의 실 집계로 렌더(offset 이동도 실데이터). 미주입=mock 데모. */
  days?: MonthDay[];
  /** 실데이터 월 라벨("7월"). */
  monthLabel?: string;
}

/**
 * 월간 시간표 본문 — 좌측 히트맵, 우측 해당 월 달성률 통합 카드.
 * day-view·week-view와 동일 grid (xl:grid-cols-[420px_1fr])로 일관 IA.
 * 실데이터 모드에선 MonthlyProgressCard 를 숨긴다 — 목표·정답률 등 블록 외 mock 수치라
 * 실 수치로 오도하지 않기 위함(B4b 에서 실 표면 연동).
 */
export function MonthView({ monthOffset = 0, onReset, days, monthLabel }: MonthViewProps) {
  const isReal = days !== undefined;
  // 실데이터: 그 달에 블록이 하나도 없으면 빈 상태. mock 데모: 기준 월 외 빈 상태.
  if (isReal ? days.every(d => d.blockCount === 0) : monthOffset !== 0) {
    return <PeriodEmptyState message="이 달엔 아직 계획이 없어요" onReset={onReset} resetLabel="이번 달 보기" />;
  }

  return (
    <div className={isReal ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]'}>
      <MonthHeatmap days={days} monthLabel={monthLabel} />
      {!isReal && <MonthlyProgressCard />}
    </div>
  );
}

/** 월간 메타. offset≠0은 빈 통계. */
export function getMonthMeta(monthOffset = 0) {
  if (monthOffset !== 0) return { totalBlocks: 0 };
  const totalBlocks = monthView.reduce((s, d) => s + d.blockCount, 0);
  return { totalBlocks };
}

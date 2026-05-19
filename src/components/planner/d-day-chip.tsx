import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDDayTier, tierChipClass } from '@/lib/planner/d-day-tier';

type Props = {
  /** D-day 일수 (양수=시험 전, 0=당일, 음수=지난 후) */
  dday: number;
  /** 시험명 (호버 툴팁용) */
  examName?: string;
  /** 추가 className */
  className?: string;
};

/**
 * D-day Tier 시각 강도가 반영된 알약(chip).
 * - 평시(D-31+): muted 톤
 * - 주의(D-15~30): brand 톤
 * - 임박(D-7~14): warn-cta-bg 톤 + 캘린더 아이콘
 * - 직전(D-1~6): danger 톤 + pulse 모션
 * - 당일(D-0): danger solid + "오늘 D-Day"
 */
export function DDayChip({ dday, examName, className }: Props) {
  const tier = getDDayTier(dday);
  const chipCls = tierChipClass(tier);
  const showCalIcon = tier === 'imminent' || tier === 'critical' || tier === 'today';

  const label =
    tier === 'today' ? '오늘 D-DAY'
    : dday > 0 ? `D-${dday}`
    : `D+${Math.abs(dday)}`;

  const title = examName
    ? `${examName} · ${tier === 'today' ? '오늘' : dday > 0 ? `${dday}일 남음` : `${Math.abs(dday)}일 지남`}`
    : undefined;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-xs',
        chipCls,
        className,
      )}
      title={title}
    >
      {showCalIcon && <Calendar className="h-3 w-3" aria-hidden />}
      {label}
    </span>
  );
}

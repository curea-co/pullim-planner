'use client';

/**
 * 주간 레이아웃 — 요일별 막대 차트.
 * 7일 × 총 학습 시간. 양의 비교 + 목표선. 미니멀 형식.
 *
 * 데이터: `weeklyStudyHours` (일별 hours + goal).
 * 색상: 활성 팔레트의 `concept` 색을 막대 채우기에 사용 (학습 시간은 단일 차원이라 타입별 색이 의미 없음).
 */

import { weeklyStudyHours, getBlockColor, type PaletteId } from '@/lib/mock';
import { cn } from '@/lib/utils';

type Props = {
  paletteId?: PaletteId;
  compact?: boolean;
};

export function BarWeekLayout({ paletteId, compact }: Props) {
  const goal = weeklyStudyHours[0]?.goal ?? 4;
  const maxValue = Math.max(...weeklyStudyHours.map(d => Math.max(d.hours, d.goal)));
  const total = weeklyStudyHours.reduce((s, d) => s + d.hours, 0);
  const goalTotal = weeklyStudyHours.reduce((s, d) => s + d.goal, 0);
  const pct = Math.round((total / goalTotal) * 100);
  const barColor = getBlockColor('concept', paletteId);
  const goalColor = getBlockColor('break', paletteId);

  const chartHeight = compact ? 80 : 140;

  return (
    <section className="bg-card overflow-hidden rounded-2xl border p-3">
      {!compact && (
        <header className="mb-2 flex items-baseline justify-between">
          <h3 className="text-pullim-slate-900 text-sm font-bold">이번 주 학습 시간</h3>
          <div className="text-right">
            <span className="text-pullim-slate-900 font-mono text-base font-bold">{total.toFixed(1)}h</span>
            <span className="text-pullim-slate-600 ml-1 text-xs">/ {goalTotal}h ({pct}%)</span>
          </div>
        </header>
      )}

      {/* 차트 영역 */}
      <div className="relative flex items-end gap-1.5" style={{ height: chartHeight }}>
        {/* 목표선 (수평) */}
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 left-0 border-t border-dashed"
          style={{
            bottom: `${(goal / maxValue) * 100}%`,
            borderColor: goalColor,
          }}
        />
        {weeklyStudyHours.map(d => {
          const barPct = Math.round((d.hours / maxValue) * 100);
          const hitGoal = d.hours >= d.goal;
          return (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
              <div className="relative flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${barPct}%`,
                    background: barColor,
                    opacity: hitGoal ? 0.95 : 0.55,
                  }}
                  title={`${d.day} · ${d.hours.toFixed(1)}h / 목표 ${d.goal}h`}
                />
              </div>
              <div className={cn(
                'text-pullim-slate-700 font-mono text-[10px] font-semibold',
              )}>
                {d.day}
              </div>
              <div className="text-pullim-slate-500 font-mono text-[9px]">
                {d.hours.toFixed(1)}
              </div>
            </div>
          );
        })}
      </div>

      {!compact && (
        <p className="text-pullim-slate-500 mt-2 text-[10px]">
          점선 = 목표({goal}h). 채워진 막대 = 목표 달성한 날.
        </p>
      )}
    </section>
  );
}

'use client';

/**
 * 주간 레이아웃 — 요일별 막대 차트.
 * 7일 × 총 학습 시간. 양의 비교 + 목표선. 미니멀 형식.
 *
 * 데이터: `weeklyStudyHours` (일별 hours + goal).
 * 색상: 활성 팔레트의 `concept` 색을 막대 채우기에 사용 (학습 시간은 단일 차원이라 타입별 색이 의미 없음).
 */

import { weeklyStudyHours, getBlockColor, type PaletteId, type WeekDay } from '@/lib/mock';
import { weekDaysToHours } from '@/lib/planner/home-data';
import { cn } from '@/lib/utils';

type Props = {
  paletteId?: PaletteId;
  compact?: boolean;
  /** 실데이터(B4) — 주입 시 요일별 *계획 시간*만 표시. 목표 표면 미보유라 목표선·달성률·달성색은 숨김(오도 방지, B4b). */
  days?: WeekDay[];
};

export function BarWeekLayout({ paletteId, compact, days }: Props) {
  const isReal = days !== undefined;
  const hoursByDay: { day: string; hours: number; goal?: number }[] = isReal
    ? weekDaysToHours(days)
    : weeklyStudyHours;
  const goal = isReal ? null : (weeklyStudyHours[0]?.goal ?? 4);
  const maxValue = Math.max(1, ...hoursByDay.map(d => Math.max(d.hours, d.goal ?? 0)));
  // 합계는 원본 분(minutes)에서 1회만 반올림 — 일별 반올림값 재합산의 오차(CalendarShell weekMeta 와
  // 불일치) 방지(codex). mock 은 시간 단위 원본이라 그대로 합산.
  const total = isReal
    ? Math.round(days.reduce((s, d) => s + d.totalMinutes, 0) / 6) / 10
    : hoursByDay.reduce((s, d) => s + d.hours, 0);
  const goalTotal = isReal ? null : weeklyStudyHours.reduce((s, d) => s + d.goal, 0);
  const pct = goalTotal ? Math.round((total / goalTotal) * 100) : null;
  const barColor = getBlockColor('concept', paletteId);
  const goalColor = getBlockColor('break', paletteId);

  const chartHeight = compact ? 80 : 140;

  return (
    <section className="bg-card overflow-hidden rounded-2xl border p-3">
      {!compact && (
        <header className="mb-2 flex items-baseline justify-between">
          <h3 className="text-pullim-slate-900 text-sm font-bold">
            {isReal ? '이번 주 계획 시간' : '이번 주 학습 시간'}
          </h3>
          <div className="text-right">
            <span className="text-pullim-slate-900 font-mono text-base font-bold">{total.toFixed(1)}h</span>
            {goalTotal !== null && pct !== null && (
              <span className="text-pullim-slate-600 ml-1 text-xs">/ {goalTotal}h ({pct}%)</span>
            )}
          </div>
        </header>
      )}

      {/* 차트 영역 */}
      <div className="relative flex items-end gap-1.5" style={{ height: chartHeight }}>
        {/* 목표선 (수평) — 목표 표면 있는 mock 모드만 */}
        {goal !== null && (
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 left-0 border-t border-dashed"
            style={{
              bottom: `${(goal / maxValue) * 100}%`,
              borderColor: goalColor,
            }}
          />
        )}
        {hoursByDay.map(d => {
          const barPct = Math.round((d.hours / maxValue) * 100);
          const hitGoal = d.goal !== undefined && d.hours >= d.goal;
          return (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
              <div className="relative flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${barPct}%`,
                    background: barColor,
                    opacity: isReal || hitGoal ? 0.95 : 0.55,
                  }}
                  title={
                    d.goal !== undefined
                      ? `${d.day} · ${d.hours.toFixed(1)}h / 목표 ${d.goal}h`
                      : `${d.day} · 계획 ${d.hours.toFixed(1)}h`
                  }
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

      {!compact && goal !== null && (
        <p className="text-pullim-slate-500 mt-2 text-[10px]">
          점선 = 목표({goal}h). 채워진 막대 = 목표 달성한 날.
        </p>
      )}
    </section>
  );
}

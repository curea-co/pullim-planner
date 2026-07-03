'use client';

import { useRouter } from 'next/navigation';
import { Flag } from 'lucide-react';
import { toast } from 'sonner';
import { monthView, type MonthDay } from '@/lib/mock';
import { cn } from '@/lib/utils';

const weekHeader = ['월', '화', '수', '목', '금', '토', '일'];

/**
 * 월간 히트맵 — 일별 블록 수 색 강도 + D-day 마일스톤 표시.
 * 핸드오프 4.4 (월간 뷰).
 *
 * 셀 클릭 — 과거/오늘은 일간 뷰로 drill-down. 미래는 "초안 미리보기" 토스트.
 */
export function MonthHeatmap({
  days: daysProp,
  monthLabel,
}: {
  /** 실데이터(B4) — 미주입이면 mock 데모(monthView) 폴백. */
  days?: MonthDay[];
  /** 실데이터 월 라벨("7월"). 미주입=데모 라벨. */
  monthLabel?: string;
} = {}) {
  const router = useRouter();
  const month = daysProp ?? monthView;
  // 그리드 시작 — 첫 날의 weekday로 빈 셀 padding
  const firstWeekdayIdx = weekHeader.indexOf(month[0].weekday);
  const padBefore = firstWeekdayIdx;

  function onCell(d: MonthDay) {
    if (d.isFuture) {
      toast.info(`📅 ${d.date}일 초안`, {
        description: `예상 ${d.blockCount}개 블록 — 활성화 후 일간 뷰에서 확인할 수 있어요.`,
      });
      return;
    }
    // 데모 — 데이터 단위가 오늘 1일치만 있어 모두 day view로 보냄.
    router.push('/planner/calendar?view=day');
  }

  return (
    <section className="bg-card overflow-hidden rounded-2xl border">
      <header className="border-b p-4">
        <p className="text-pullim-blue-600 text-[10px] font-bold tracking-wider uppercase">
          월간 학습 캘린더
        </p>
        <h2 className="text-pullim-slate-900 mt-0.5 text-base font-bold tracking-tight">
          {monthLabel ?? '4월'} 학습 분포
        </h2>
        <p className="text-pullim-slate-500 mt-0.5 inline-flex flex-wrap items-center gap-1 text-[11px]">
          <span>색 농도 = 블록 수 · 외곽선 = 완료율 ·</span>
          <Flag aria-hidden className="h-3 w-3" />
          <span>= 시험·모평</span>
        </p>
      </header>

      <div className="p-4">
        {/* 요일 헤더 */}
        <div className="text-pullim-slate-600 mb-1.5 grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold">
          {weekHeader.map(w => (
            <div key={w} className={w === '토' || w === '일' ? 'text-pullim-slate-700' : ''}>{w}</div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: padBefore }, (_, i) => (
            <div key={`pad-${i}`} aria-hidden />
          ))}
          {month.map(d => <DayCell key={d.date} day={d} onSelect={() => onCell(d)} />)}
        </div>

        {/* 범례 */}
        <div className="text-pullim-slate-500 mt-4 flex flex-wrap items-center gap-3 text-[10px]">
          <span className="font-bold tracking-wider uppercase">강도</span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-pullim-heat-0 border border-pullim-slate-200" /> 0개
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-pullim-heat-2" /> 4–5
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-pullim-heat-4" /> 6–7
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-pullim-heat-5" /> 8+
          </span>
          <span className="ml-auto inline-flex items-center gap-1">
            <span className="border-pullim-success h-3 w-3 rounded-sm border-2" /> 100% 완료
          </span>
        </div>
      </div>
    </section>
  );
}

function heatColor(count: number, isFuture: boolean): string {
  if (isFuture) return 'transparent';
  if (count === 0) return 'var(--color-pullim-heat-0)';
  if (count <= 3)  return 'var(--color-pullim-heat-1)';
  if (count <= 5)  return 'var(--color-pullim-heat-2)';
  if (count <= 7)  return 'var(--color-pullim-heat-3)';
  if (count <= 8)  return 'var(--color-pullim-heat-4)';
  return 'var(--color-pullim-heat-5)';
}

function DayCell({ day, onSelect }: { day: MonthDay; onSelect: () => void }) {
  const bg = heatColor(day.blockCount, !!day.isFuture);
  // 흰 텍스트는 heat-4 이상에서만 안전 (heat-3 #5A8BFF는 흰글자 대비 3.9:1로 부족)
  const isDarkBg = day.blockCount >= 8;
  const completed = day.completionPct === 100;
  const milestoneLabel = day.examMilestone?.label;
  const tooltip = milestoneLabel
    ? `${day.date}일 · ${day.blockCount}개 블록 · 완료 ${day.completionPct}% · ${milestoneLabel}`
    : `${day.date}일 · ${day.blockCount}개 블록 · 완료 ${day.completionPct}%`;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={tooltip}
      title={tooltip}
      className={cn(
        'group relative aspect-square cursor-pointer rounded-lg border transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 focus-visible:ring-offset-1',
        'hover:scale-[1.04] active:scale-[0.98]',
        day.isFuture
          ? 'border-dashed border-pullim-slate-200 hover:border-pullim-blue-300'
          : 'border-transparent',
        day.isToday && 'ring-pullim-blue-500 ring-2 ring-offset-1',
        completed && !day.isToday && !day.isFuture && 'border-pullim-success border-2',
      )}
      style={{ background: bg }}
    >
      <div className="flex h-full flex-col items-center justify-center">
        <span
          className={cn(
            'font-mono text-xs font-bold',
            isDarkBg ? 'text-white' : day.isFuture ? 'text-pullim-slate-500' : 'text-pullim-slate-900',
            day.isToday && !isDarkBg && 'text-pullim-blue-700',
          )}
        >
          {day.date}
        </span>
        {day.blockCount > 0 && !day.isFuture && (
          <span
            className={cn(
              'text-[8px] font-mono mt-0.5 font-semibold',
              isDarkBg ? 'text-white/95' : 'text-pullim-slate-700',
            )}
          >
            {day.blockCount}개
          </span>
        )}
        {day.hasExamMilestone && (
          <Flag
            aria-label={`${day.examMilestone?.label ?? '시험·모평'}`}
            className={cn(
              'absolute top-0 right-0 h-3 w-3',
              day.examMilestone?.importance === 'high' ? 'text-pullim-danger' : 'text-pullim-warn',
            )}
          />
        )}
      </div>
    </button>
  );
}

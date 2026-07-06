'use client';

import { Flag, CalendarDays } from 'lucide-react';
import { type MonthDay } from '@/lib/mock';
import { cn } from '@/lib/utils';

/**
 * 월간 계획 요약(실데이터 ①-1단계) — MonthlyProgressCard(mock: 목표 시간·약점·streak)를 대체하는
 * 실모드 우측 카드. **블록 파생값만**: 계획 블록 수·학습 예정일·이 달의 시험 마일스톤. D-day 는 홈
 * 상단 DDayHeaderBand 가 이미 노출한다. 완료율·목표는 BE 준비 전이라 넣지 않는다(B4b ①-2단계).
 */
export function MonthPlanSummary({ days }: { days: MonthDay[] }) {
  const totalBlocks = days.reduce((s, d) => s + d.blockCount, 0);
  const studyDays = days.filter((d) => d.blockCount > 0).length;
  const examDays = days.filter((d) => d.hasExamMilestone);

  return (
    <section className="bg-card flex flex-col rounded-2xl border p-5">
      <header className="mb-3">
        <p className="text-pullim-blue-600 text-[10px] font-bold tracking-wider uppercase">
          이번 달 계획
        </p>
        <h2 className="text-pullim-slate-900 mt-0.5 text-base font-bold tracking-tight">
          한눈에 계획 요약
        </h2>
      </header>

      <div className="bg-pullim-blue-50/60 rounded-xl p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-pullim-slate-700 inline-flex items-center gap-1 text-xs font-semibold">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            계획 블록
          </span>
          <span className="text-pullim-blue-600 font-mono text-base font-bold">
            {totalBlocks}개
          </span>
        </div>
        <div className="text-pullim-slate-500 mt-1 text-[11px]">
          학습 예정 <span className="text-pullim-blue-700 font-mono font-bold">{studyDays}</span>일
        </div>
      </div>

      <section className="mt-3">
        <h3 className="text-pullim-slate-700 mb-2 text-[11px] font-bold tracking-wider uppercase">
          이 달의 시험·모평
        </h3>
        {examDays.length === 0 ? (
          <p className="text-pullim-slate-500 text-xs italic">이번 달 예정된 시험이 없어요.</p>
        ) : (
          <ul className="space-y-1.5">
            {examDays.map((d) => (
              <li
                key={d.date}
                className={cn(
                  'flex items-center gap-2 rounded-xl border p-3',
                  d.examMilestone?.importance === 'high'
                    ? 'bg-pullim-danger/10 border-pullim-danger/30'
                    : 'bg-pullim-warn/10 border-pullim-warn/30',
                )}
              >
                <span
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
                    d.examMilestone?.importance === 'high' ? 'bg-pullim-danger' : 'bg-pullim-warn',
                  )}
                >
                  <Flag aria-hidden className="h-4 w-4 text-white" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-pullim-slate-900 truncate text-sm font-bold">
                    {d.date}일 · {d.examMilestone?.label ?? '시험'}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

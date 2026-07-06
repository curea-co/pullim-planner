'use client';

import { CalendarRange } from 'lucide-react';
import { blockTypeMeta, type BlockType, type WeekDay } from '@/lib/mock';
import { cn } from '@/lib/utils';

/**
 * 주간 계획 요약(실데이터 ①-1단계) — WeeklyGoalsCard(mock: 목표·정답률·약점)를 대체하는 실모드
 * 우측 카드. **블록 파생값만** 노출한다: 계획 시간·학습 예정일·블록 타입 구성. 완료율·목표는
 * BE 표면(완료 기록 API·goal) 준비 전이라 넣지 않는다(0/오도 방지 — B4b ①-2단계에서 확장).
 */
export function WeekPlanSummary({ days }: { days: WeekDay[] }) {
  const totalMinutes = days.reduce((s, d) => s + d.totalMinutes, 0);
  const totalHours = Math.round((totalMinutes / 60) * 10) / 10;
  const studyDays = days.filter((d) => d.totalMinutes > 0).length;

  // 요일 집계를 타입별로 합산(break 은 grid 에서 이미 제외됨).
  const byType = new Map<BlockType, number>();
  for (const d of days) {
    for (const b of d.blocks) {
      byType.set(b.type, (byType.get(b.type) ?? 0) + b.count);
    }
  }
  const typeRows = [...byType.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <section className="bg-card flex flex-col rounded-2xl border p-5">
      <header className="mb-3">
        <p className="text-pullim-blue-600 text-[10px] font-bold tracking-wider uppercase">
          이번 주 계획
        </p>
        <h2 className="text-pullim-slate-900 mt-0.5 text-base font-bold tracking-tight">
          한눈에 계획 요약
        </h2>
      </header>

      <div className="bg-pullim-blue-50/60 rounded-xl p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-pullim-slate-700 inline-flex items-center gap-1 text-xs font-semibold">
            <CalendarRange className="h-3.5 w-3.5" aria-hidden />
            계획 시간
          </span>
          <span className="text-pullim-blue-600 font-mono text-base font-bold">
            {totalHours}h
          </span>
        </div>
        <div className="text-pullim-slate-500 mt-1 text-[11px]">
          학습 예정 <span className="text-pullim-blue-700 font-mono font-bold">{studyDays}</span>
          <span className="mx-0.5">/</span>7일
        </div>
      </div>

      <section className="mt-3">
        <h3 className="text-pullim-slate-700 mb-2 text-[11px] font-bold tracking-wider uppercase">
          블록 타입 구성
        </h3>
        {typeRows.length === 0 ? (
          <p className="text-pullim-slate-500 text-xs italic">이번 주 계획 블록이 없어요.</p>
        ) : (
          <ul className="space-y-1.5">
            {typeRows.map(([type, count]) => {
              const meta = blockTypeMeta[type];
              const MetaIcon = meta.Icon;
              return (
                <li key={type} className="flex items-center gap-2 text-xs">
                  <MetaIcon aria-hidden className="text-pullim-slate-500 h-3.5 w-3.5 shrink-0" />
                  <span className="text-pullim-slate-700 flex-1 truncate font-semibold">
                    {meta.label}
                  </span>
                  <span className={cn('text-pullim-slate-900 font-mono text-[11px] font-bold')}>
                    {count}개
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </section>
  );
}

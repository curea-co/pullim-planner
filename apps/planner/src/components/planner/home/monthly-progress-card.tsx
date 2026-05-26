'use client';

import Link from 'next/link';
import {
  Trophy, Flame, Flag, ArrowRight, Clock,
  type LucideIcon,
} from 'lucide-react';
import {
  monthView, currentPersona, getDday, getNextMilestone,
  getWeakNodes, weeklyStudyHours,
} from '@/lib/mock';
import { cn } from '@/lib/utils';

/**
 * 해당 월 달성률 카드 — /planner home month view 우측에 노출.
 * 기존 month-view에 분리되어 있던 KPI 3 + 학습 시간 + 시험 카드 + 약점 진도를 *한 카드로 통합*.
 */
export function MonthlyProgressCard() {
  const totalBlocks = monthView.reduce((s, d) => s + d.blockCount, 0);
  const completedDays = monthView.filter(d => !d.isFuture && d.completionPct === 100).length;
  const pastDays = monthView.filter(d => !d.isFuture && !d.isToday).length;

  const weeklyTotalH = weeklyStudyHours.reduce((s, d) => s + d.hours, 0);
  const monthlyHours = Math.round(weeklyTotalH * 4 * 10) / 10;
  const monthlyGoalH = weeklyStudyHours.reduce((s, d) => s + d.goal, 0) * 4;

  const dday = getDday(currentPersona);
  const totalPrepDays = 90;
  const progressPct = Math.max(0, Math.min(100, Math.round(((totalPrepDays - dday) / totalPrepDays) * 100)));

  const milestone = getNextMilestone();
  const weakNodes = getWeakNodes(0.7).slice(0, 3);

  return (
    <section className="bg-card flex flex-col rounded-2xl border p-5">
      <header className="mb-3">
        <p className="text-pullim-blue-600 text-[10px] font-bold tracking-wider uppercase">
          이번 달 달성률
        </p>
        <h2 className="text-pullim-slate-900 mt-0.5 text-base font-bold tracking-tight">
          큰 그림과 마일스톤
        </h2>
      </header>

      {/* 시험까지 진척률 — 진행 바 */}
      <div className="bg-pullim-blue-50/60 rounded-xl p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-pullim-slate-700 text-xs font-semibold">
            {currentPersona.examLabel}까지
          </span>
          <span className="text-pullim-blue-600 font-mono text-base font-bold">
            <span className="text-pullim-danger">D-{dday}</span>
          </span>
        </div>
        <div className="bg-card mt-2 h-2 overflow-hidden rounded-full">
          <div
            className="bg-pullim-blue-500 h-full rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="text-pullim-slate-500 mt-1 text-[11px]">
          준비 진척 <span className="text-pullim-blue-700 font-mono font-bold">{progressPct}%</span>
          <span className="mx-1">·</span>
          90일 기준
        </div>
      </div>

      {/* KPI 3종 */}
      <ul className="mt-3 grid grid-cols-3 gap-2">
        <KPI
          Icon={Trophy}
          label="100% 완료한 날"
          value={`${completedDays}일`}
          sub={`/ ${pastDays}일`}
          tone="accent"
        />
        <KPI
          Icon={Flame}
          label="연속 학습"
          value={`${currentPersona.streakDays}일`}
          sub="streak"
        />
        <KPI
          Icon={Clock}
          label="이번 달 학습"
          value={`${monthlyHours}h`}
          sub={`/ ${monthlyGoalH}h`}
        />
      </ul>

      {/* 다가오는 마일스톤 */}
      {milestone && (
        <div
          className={cn(
            'mt-3 flex items-center gap-3 rounded-xl border p-3',
            milestone.day.examMilestone?.importance === 'high'
              ? 'bg-pullim-danger/10 border-pullim-danger/30'
              : 'bg-pullim-warn/10 border-pullim-warn/30',
          )}
        >
          <span
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
              milestone.day.examMilestone?.importance === 'high'
                ? 'bg-pullim-danger'
                : 'bg-pullim-warn',
            )}
          >
            <Flag aria-hidden className="h-4 w-4 text-white" />
          </span>
          <div className="min-w-0 flex-1">
            <div
              className={cn(
                'text-[10px] font-bold tracking-wider uppercase',
                milestone.day.examMilestone?.importance === 'high'
                  ? 'text-pullim-danger'
                  : 'text-pullim-warn',
              )}
            >
              다가오는 마일스톤
            </div>
            <div className="text-pullim-slate-900 truncate text-sm font-bold">
              4월 {milestone.day.date}일 · {milestone.day.examMilestone?.label}
            </div>
            <div className="text-pullim-slate-500 text-[11px]">
              {milestone.daysAway === 0 ? '오늘' : `남은 ${milestone.daysAway}일`}
            </div>
          </div>
        </div>
      )}

      {/* 약점 Top 3 */}
      <section className="mt-3">
        <h3 className="text-pullim-slate-700 mb-2 text-[11px] font-bold tracking-wider uppercase">
          약점 단원 — 이번 달 진도
        </h3>
        {weakNodes.length === 0 ? (
          <p className="text-pullim-slate-500 text-xs italic">감지된 약점 없음</p>
        ) : (
          <ul className="space-y-1.5">
            {weakNodes.map(node => {
              const pct = Math.round((node.mastery ?? 0) * 100);
              return (
                <li key={node.id} className="flex items-center gap-2 text-xs">
                  <span className="text-pullim-slate-700 flex-1 truncate font-semibold">
                    {node.label}
                  </span>
                  <div className="bg-pullim-slate-100 h-1.5 w-16 shrink-0 overflow-hidden rounded-full">
                    <div
                      className="bg-pullim-blue-500 h-full rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-pullim-slate-700 w-9 shrink-0 text-right font-mono text-[11px] font-bold">
                    {pct}%
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <footer className="mt-auto pt-4">
        <Link
          href="/planner/reports?view=month"
          className="text-pullim-blue-600 hover:text-pullim-blue-700 inline-flex items-center gap-1 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 focus-visible:ring-offset-1 rounded"
        >
          월간 리포트 자세히
          <ArrowRight className="h-3 w-3" />
        </Link>
      </footer>
    </section>
  );
}

function KPI({
  Icon, label, value, sub, tone,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  tone?: 'accent';
}) {
  return (
    <div className="bg-pullim-slate-50 rounded-lg p-2.5">
      <div className="text-pullim-slate-500 inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div
        className={cn(
          'mt-0.5 font-mono text-sm font-bold',
          tone === 'accent' ? 'text-pullim-blue-600' : 'text-pullim-slate-900',
        )}
      >
        {value}
      </div>
      <div className="text-pullim-slate-500 text-[10px]">{sub}</div>
    </div>
  );
}

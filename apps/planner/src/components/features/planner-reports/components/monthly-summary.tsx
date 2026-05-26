'use client';

import {
  Trophy, Flame, Target, Flag, ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import {
  monthView, currentPersona, getDday, getNextMilestone,
  getWeakNodes, weeklyStudyHours,
} from '@/lib/mock';
import { MonthHeatmap } from '@/components/features/planner-home/components/month-heatmap';
import { cn } from '@/lib/utils';

/** 월간 회고 본문 — KPI 3 + 히트맵 + 약점 단원 + 다가오는 마일스톤 */
export function MonthlySummary() {
  const totalBlocks = monthView.reduce((s, d) => s + d.blockCount, 0);
  const completedDays = monthView.filter(d => !d.isFuture && d.completionPct === 100).length;
  const pastDays = monthView.filter(d => !d.isFuture && !d.isToday).length;

  // 월간 학습 시간 — 데모: 주간 평균 × 4주 가정
  const weeklyTotalH = weeklyStudyHours.reduce((s, d) => s + d.hours, 0);
  const monthlyHours = Math.round(weeklyTotalH * 4 * 10) / 10;
  const monthlyGoalH = weeklyStudyHours.reduce((s, d) => s + d.goal, 0) * 4;

  // 시험까지 진척률 — D-day 기반 단순 계산 (전체 시험 준비 기간 추정 mock)
  const dday = getDday(currentPersona);
  const totalPrepDays = 90; // 데모 가정: 시험 준비 기간 90일
  const progressPct = Math.max(0, Math.min(100, Math.round(((totalPrepDays - dday) / totalPrepDays) * 100)));

  const milestone = getNextMilestone();
  const weakNodes = getWeakNodes(0.7).slice(0, 3);

  return (
    <div className="space-y-4">
      {/* KPI 3종 */}
      <section className="grid grid-cols-3 gap-2.5">
        <KPI
          Icon={Trophy}
          label="100% 완료한 날"
          value={`${completedDays}일`}
          sub={`/ ${pastDays}일 중`}
          tone="accent"
        />
        <KPI
          Icon={Flame}
          label="현재 연속 학습"
          value={`${currentPersona.streakDays}일`}
          sub="streak"
          tone="default"
        />
        <KPI
          Icon={Target}
          label="시험까지 진척"
          value={`${progressPct}%`}
          sub={`D-${dday}`}
          tone={progressPct >= 70 ? 'good' : 'default'}
        />
      </section>

      <MonthHeatmap />

      {/* 학습 시간 요약 + 마일스톤 — 2열 */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="bg-card rounded-xl border p-4">
          <h3 className="text-pullim-slate-900 mb-1 text-sm font-bold">이번 달 학습 시간</h3>
          <p className="text-pullim-blue-600 font-mono text-2xl font-bold">
            {monthlyHours}h
            <span className="text-pullim-slate-500 ml-1 text-xs font-normal">
              / {monthlyGoalH}h 목표
            </span>
          </p>
          <p className="text-pullim-slate-500 mt-1.5 text-xs">
            평균 일일 <span className="font-mono font-semibold">{(monthlyHours / 30).toFixed(1)}h</span>
            <span className="mx-1">·</span>
            총 {totalBlocks}블록
          </p>
        </div>

        {milestone && (
          <div
            className={cn(
              'flex items-center gap-3 rounded-xl border p-4',
              milestone.day.examMilestone?.importance === 'high'
                ? 'bg-pullim-danger/10 border-pullim-danger/30'
                : 'bg-pullim-warn/10 border-pullim-warn/30',
            )}
          >
            <span
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                milestone.day.examMilestone?.importance === 'high'
                  ? 'bg-pullim-danger'
                  : 'bg-pullim-warn',
              )}
            >
              <Flag aria-hidden className="h-5 w-5 text-white" />
            </span>
            <div className="flex-1">
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
              <div className="text-pullim-slate-900 text-sm font-bold">
                4월 {milestone.day.date}일 · {milestone.day.examMilestone?.label}
              </div>
              <div className="text-pullim-slate-500 text-xs">
                {milestone.daysAway === 0 ? '오늘' : `남은 ${milestone.daysAway}일`} — 약점·빈출 단원 자동 가중
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 약점 단원 진도 */}
      <section className="bg-card rounded-xl border p-4">
        <h3 className="text-pullim-slate-900 mb-2 text-sm font-bold">약점 단원 — 이번 달 진도</h3>
        {weakNodes.length === 0 ? (
          <p className="text-pullim-slate-500 text-xs italic">감지된 약점 없음 — 좋은 흐름</p>
        ) : (
          <ul className="space-y-1.5">
            {weakNodes.map(node => {
              const pct = Math.round((node.mastery ?? 0) * 100);
              return (
                <li key={node.id} className="flex items-center gap-2 text-xs">
                  <span className="text-pullim-slate-700 flex-1 truncate font-semibold">
                    {node.label}
                  </span>
                  <div className="bg-pullim-slate-100 h-1.5 w-32 overflow-hidden rounded-full">
                    <div
                      className="bg-pullim-blue-500 h-full rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-pullim-slate-700 w-10 text-right font-mono font-bold">
                    {pct}%
                  </span>
                  <ArrowRight className="text-pullim-slate-300 h-3 w-3" />
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function KPI({
  Icon, label, value, sub, tone,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  tone: 'default' | 'accent' | 'good';
}) {
  const valueClass =
    tone === 'good' ? 'text-pullim-success'
    : tone === 'accent' ? 'text-pullim-blue-600'
    : 'text-pullim-slate-900';
  return (
    <div className="bg-card rounded-xl border p-3">
      <div className="text-pullim-slate-500 inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className={`mt-1 font-mono text-lg font-bold ${valueClass}`}>{value}</div>
      <div className="text-pullim-slate-500 text-[10px]">{sub}</div>
    </div>
  );
}

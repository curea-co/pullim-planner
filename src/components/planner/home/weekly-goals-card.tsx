'use client';

import Link from 'next/link';
import {
  Target, Flame, Smile, ArrowRight, Sparkles, AlertTriangle, CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import {
  weeklyStudyHours, weekView, dailyReflection, getWeakNodes,
  type ReflectionInsight,
} from '@/lib/mock';
import { cn } from '@/lib/utils';

const insightIcon: Record<ReflectionInsight['icon'], { Icon: LucideIcon; tone: string; bg: string }> = {
  sparkle: { Icon: Sparkles,        tone: 'text-pullim-blue-700',   bg: 'bg-pullim-blue-50' },
  check:   { Icon: CheckCircle2,    tone: 'text-pullim-success',    bg: 'bg-pullim-success-bg' },
  warn:    { Icon: AlertTriangle,   tone: 'text-pullim-warn',       bg: 'bg-pullim-warn-bg' },
};

const homeWeeklyInsights: ReflectionInsight[] = [
  { icon: 'sparkle', text: '수학 정답률 +12% — 새 단원 진입 적기' },
  { icon: 'warn',    text: '월·화 학습 시간 부족 — 평일 시간대 점검' },
];

/**
 * 주간 달성 목표 카드 — /planner home week view 우측에 노출.
 * Reports의 weekly-summary는 *상세 분석*이고, 이 카드는 *홈에서의 한눈에 요약*.
 */
export function WeeklyGoalsCard() {
  const totalHours = weeklyStudyHours.reduce((s, d) => s + d.hours, 0);
  const goalHours = weeklyStudyHours.reduce((s, d) => s + d.goal, 0);
  const todayMetrics = dailyReflection();
  const weakNodes = getWeakNodes(0.7);
  const conqueredCount = weakNodes.filter(n => (n.mastery ?? 0) >= 0.7 && (n.mastery ?? 0) < 0.85).length;

  const weeklyCompletionAvg = Math.round(
    weekView.reduce((s, d) => s + d.completionPct, 0) / weekView.length,
  );
  const goalAchievementPct = Math.min(100, Math.round((totalHours / goalHours) * 100));

  return (
    <section className="bg-card flex flex-col rounded-2xl border p-5">
      <header className="mb-3">
        <p className="text-pullim-blue-600 text-[10px] font-bold tracking-wider uppercase">
          이번 주 달성 목표
        </p>
        <h2 className="text-pullim-slate-900 mt-0.5 text-base font-bold tracking-tight">
          한눈에 진행률 요약
        </h2>
      </header>

      {/* 진행률 헤더 — 학습 시간 vs 목표 */}
      <div className="bg-pullim-blue-50/60 rounded-xl p-3.5">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-pullim-slate-700 text-xs font-semibold">학습 시간</span>
          <span className="text-pullim-blue-600 font-mono text-base font-bold">
            {totalHours.toFixed(1)}h
            <span className="text-pullim-slate-500 ml-1 text-xs font-normal">/ {goalHours}h</span>
          </span>
        </div>
        <div className="bg-card mt-2 h-2 overflow-hidden rounded-full">
          <div
            className="bg-pullim-blue-500 h-full rounded-full transition-all"
            style={{ width: `${goalAchievementPct}%` }}
          />
        </div>
        <div className="text-pullim-slate-500 mt-1 text-[11px]">
          목표 대비 <span className="text-pullim-blue-700 font-mono font-bold">{goalAchievementPct}%</span>
          <span className="mx-1">·</span>
          완료율 평균 {weeklyCompletionAvg}%
        </div>
      </div>

      {/* 메트릭 3종 */}
      <ul className="mt-3 grid grid-cols-3 gap-2">
        <Metric
          Icon={Target}
          label="평균 정답률"
          value={todayMetrics.avgAccuracy === null ? '—' : `${todayMetrics.avgAccuracy}%`}
          tone="accent"
        />
        <Metric
          Icon={Flame}
          label="약점 정복"
          value={`${conqueredCount}건`}
          sub={`잔여 ${weakNodes.length - conqueredCount}`}
        />
        <Metric
          Icon={Smile}
          label="감정 평균"
          value={todayMetrics.avgEmotion === null ? '—' : `${todayMetrics.avgEmotion.toFixed(1)}`}
          sub="/ 5점"
        />
      </ul>

      {/* 인사이트 */}
      <section className="mt-3">
        <h3 className="text-pullim-slate-700 mb-2 text-[11px] font-bold tracking-wider uppercase">
          이번 주 인사이트
        </h3>
        <ul className="space-y-1.5">
          {homeWeeklyInsights.map((it, i) => {
            const meta = insightIcon[it.icon];
            const Icon = meta.Icon;
            return (
              <li
                key={i}
                className={cn(
                  'flex items-start gap-2 rounded-lg p-2.5 text-xs leading-relaxed',
                  meta.bg,
                )}
              >
                <Icon aria-hidden className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', meta.tone)} />
                <span className={cn('font-semibold', meta.tone)}>{it.text}</span>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 약점 단원 진도 — 간결 4개 */}
      <section className="mt-3">
        <h3 className="text-pullim-slate-700 mb-2 text-[11px] font-bold tracking-wider uppercase">
          약점 단원 진도
        </h3>
        <ul className="space-y-1.5">
          {weakNodes.slice(0, 4).map(node => {
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
      </section>

      <footer className="mt-auto pt-4">
        <Link
          href="/planner/reports?view=week"
          className="text-pullim-blue-600 hover:text-pullim-blue-700 inline-flex items-center gap-1 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 focus-visible:ring-offset-1 rounded"
        >
          주간 리포트 자세히
          <ArrowRight className="h-3 w-3" />
        </Link>
      </footer>
    </section>
  );
}

function Metric({
  Icon, label, value, sub, tone,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
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
      {sub && <div className="text-pullim-slate-500 text-[10px]">{sub}</div>}
    </div>
  );
}

'use client';

import {
  Clock, Target, Flame, Smile, Sparkles, AlertTriangle, CheckCircle2,
  type LucideIcon,
} from 'lucide-react';
import {
  weeklyStudyHours, weekView, dailyReflection, getWeakNodes,
  type ReflectionInsight,
} from '@/lib/mock';
import { WeeklyChart } from '@/components/planner/weekly-chart';
import { AccuracyTrendChart } from './accuracy-trend-chart';
import { cn } from '@/lib/utils';

const insightIcon: Record<ReflectionInsight['icon'], { Icon: LucideIcon; tone: string; bg: string }> = {
  sparkle: { Icon: Sparkles,        tone: 'text-pullim-blue-700',   bg: 'bg-pullim-blue-50' },
  check:   { Icon: CheckCircle2,    tone: 'text-pullim-success',    bg: 'bg-pullim-success-bg' },
  warn:    { Icon: AlertTriangle,   tone: 'text-pullim-warn',       bg: 'bg-pullim-warn-bg' },
};

/** 이번 주 인사이트 — mock 룰 기반 (데모 단계). */
const weeklyInsights: ReflectionInsight[] = [
  { icon: 'sparkle', text: '수학 정답률 +12% — 새 단원 진입 적기' },
  { icon: 'check',   text: '영어 빈칸 추론 — 약점 정복 1건 완료' },
  { icon: 'warn',    text: '월·화 학습 시간 부족 — 평일 시간대 점검 필요' },
];

/** 주간 회고 본문 — 메트릭 4 + 차트 2 + 약점 진도 + 인사이트 */
export function WeeklySummary() {
  const totalHours = weeklyStudyHours.reduce((s, d) => s + d.hours, 0);
  const goalHours = weeklyStudyHours.reduce((s, d) => s + d.goal, 0);
  const todayMetrics = dailyReflection();
  // 약점 정복 — 데모: getWeakNodes 결과 중 mastery 0.7+ 가 정복으로 간주
  const weakNodes = getWeakNodes(0.7);
  const conqueredCount = weakNodes.filter(n => (n.mastery ?? 0) >= 0.7 && (n.mastery ?? 0) < 0.85).length;

  // 주간 완료율 — weekView 7일 평균
  const weeklyCompletionAvg = Math.round(
    weekView.reduce((s, d) => s + d.completionPct, 0) / weekView.length,
  );

  return (
    <div className="space-y-4">
      {/* 메트릭 4종 */}
      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Metric
          Icon={Clock}
          label="학습 시간"
          value={`${totalHours.toFixed(1)}h`}
          sub={`/ ${goalHours.toFixed(0)}h 목표`}
          tone={totalHours >= goalHours ? 'good' : 'default'}
        />
        <Metric
          Icon={Target}
          label="평균 정답률"
          value={todayMetrics.avgAccuracy === null ? '—' : `${todayMetrics.avgAccuracy}%`}
          sub={`완료율 ${weeklyCompletionAvg}%`}
          tone="accent"
        />
        <Metric
          Icon={Flame}
          label="약점 정복"
          value={`${conqueredCount}건`}
          sub={`잔여 ${weakNodes.length - conqueredCount}건`}
          tone="default"
        />
        <Metric
          Icon={Smile}
          label="감정 평균"
          value={todayMetrics.avgEmotion === null ? '—' : `${todayMetrics.avgEmotion.toFixed(1)} / 5`}
          sub="블록 완료 시 보고"
          tone="default"
        />
      </section>

      {/* 차트 2종 */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <WeeklyChart />
        <AccuracyTrendChart />
      </section>

      {/* 약점 진도 */}
      <section className="bg-card rounded-xl border p-4">
        <h3 className="text-pullim-slate-900 mb-2 text-sm font-bold">
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
                <div className="bg-pullim-slate-100 h-1.5 w-24 overflow-hidden rounded-full">
                  <div
                    className="bg-pullim-blue-500 h-full rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-pullim-slate-700 w-10 text-right font-mono font-bold">
                  {pct}%
                </span>
              </li>
            );
          })}
          {weakNodes.length === 0 && (
            <li className="text-pullim-slate-400 text-xs italic">현재 약점 없음 — 좋은 흐름</li>
          )}
        </ul>
      </section>

      {/* 인사이트 */}
      <section>
        <h3 className="text-pullim-slate-900 mb-2 text-sm font-bold">이번 주 인사이트</h3>
        <ul className="space-y-1.5">
          {weeklyInsights.map((it, i) => {
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
    </div>
  );
}

function Metric({
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
      <div className={`mt-1 font-mono text-base font-bold ${valueClass}`}>{value}</div>
      <div className="text-pullim-slate-400 text-[10px]">{sub}</div>
    </div>
  );
}

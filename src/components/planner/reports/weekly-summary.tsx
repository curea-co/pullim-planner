'use client';

import {
  Clock, Target, Flame, Smile, Sparkles, AlertTriangle, CheckCircle2,
  Heart, Battery,
  type LucideIcon,
} from 'lucide-react';
import {
  getWeakNodes, weeklyReflection, thisWeekInsights, lastWeekSummary,
  weeklyConditionTrend, weeklyBurnoutTrend, conditionMeta,
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

/** 주간 회고 본문 — 메트릭 4(주간 평균) + 차트 2 + 컨디션·번아웃 trend + 약점 진도 + 동적 인사이트 */
export function WeeklySummary() {
  const w = weeklyReflection();
  const insights = thisWeekInsights();
  const weakNodes = getWeakNodes(0.7);

  return (
    <div className="space-y-4">
      {/* 메트릭 4종 — 주간 평균 + vs 지난 주 보조 */}
      <section className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <Metric
          Icon={Clock}
          label="학습 시간"
          value={`${w.totalHours.toFixed(1)}h`}
          sub={`/ ${w.goalHours.toFixed(0)}h 목표`}
          delta={w.totalHours - lastWeekSummary.totalHours}
          deltaUnit="h"
          tone={w.totalHours >= w.goalHours ? 'good' : 'default'}
        />
        <Metric
          Icon={Target}
          label="평균 정답률"
          value={`${w.avgAccuracy}%`}
          sub={`완료율 ${w.completionAvg}%`}
          delta={w.avgAccuracy - lastWeekSummary.avgAccuracy}
          deltaUnit="%p"
          tone="accent"
        />
        <Metric
          Icon={Flame}
          label="약점 정복"
          value={`${w.weakConquered}건`}
          sub={`잔여 ${weakNodes.length - w.weakConquered}건`}
          delta={w.weakConquered - lastWeekSummary.weakConquered}
          deltaUnit="건"
          tone="default"
        />
        <Metric
          Icon={Smile}
          label="감정 평균"
          value={`${w.avgEmotion.toFixed(1)} / 5`}
          sub="블록 완료 시 보고"
          delta={w.avgEmotion - lastWeekSummary.avgEmotion}
          deltaUnit=""
          tone="default"
        />
      </section>

      {/* 차트 2종 */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <WeeklyChart />
        <AccuracyTrendChart />
      </section>

      {/* 컨디션·번아웃 trend — 시그니처 데이터 */}
      <section className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <ConditionTrendCard />
        <BurnoutTrendCard />
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

      {/* 동적 인사이트 */}
      <section>
        <h3 className="text-pullim-slate-900 mb-2 text-sm font-bold">이번 주 인사이트</h3>
        <ul className="space-y-1.5">
          {insights.map((it, i) => {
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

function ConditionTrendCard() {
  const max = 5;
  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-pullim-slate-900 inline-flex items-center gap-1.5 text-sm font-bold">
          <Heart className="text-pullim-blue-600 h-3.5 w-3.5" /> 컨디션 trend
        </h3>
        <span className="text-pullim-slate-400 text-[10px]">7일 자기 보고</span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-1">
        {weeklyConditionTrend.map(d => {
          const meta = conditionMeta[d.level];
          const h = (d.level / max) * 100;
          return (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
              <span aria-hidden className="text-[14px]">{meta.emoji}</span>
              <div className="bg-pullim-slate-100 relative h-12 w-full overflow-hidden rounded">
                <div
                  className="bg-pullim-blue-400 absolute bottom-0 w-full"
                  style={{ height: `${h}%` }}
                />
              </div>
              <span className="text-pullim-slate-500 text-[10px] font-semibold">{d.day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BurnoutTrendCard() {
  const lowDay = weeklyBurnoutTrend.reduce((a, b) => (a.score < b.score ? a : b));
  return (
    <div className="bg-card rounded-xl border p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-pullim-slate-900 inline-flex items-center gap-1.5 text-sm font-bold">
          <Battery className="text-pullim-blue-600 h-3.5 w-3.5" /> 번아웃 안전도
        </h3>
        <span className="text-pullim-slate-400 text-[10px]">높을수록 안전</span>
      </div>
      <div className="mt-3 flex items-end justify-between gap-1">
        {weeklyBurnoutTrend.map(d => {
          const h = d.score;
          const isLow = d.day === lowDay.day;
          return (
            <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
              <span className={cn('text-[10px] font-mono font-bold', isLow ? 'text-pullim-warn' : 'text-pullim-slate-600')}>
                {d.score}
              </span>
              <div className="bg-pullim-slate-100 relative h-12 w-full overflow-hidden rounded">
                <div
                  className={cn('absolute bottom-0 w-full', isLow ? 'bg-pullim-warn' : 'bg-pullim-success')}
                  style={{ height: `${h}%` }}
                />
              </div>
              <span className="text-pullim-slate-500 text-[10px] font-semibold">{d.day}</span>
            </div>
          );
        })}
      </div>
      {lowDay.score < 60 && (
        <p className="text-pullim-warn mt-2 text-[11px] font-semibold">
          ⚠ {lowDay.day}요일 위험 신호 — 휴식 권장
        </p>
      )}
    </div>
  );
}

function Metric({
  Icon, label, value, sub, tone, delta, deltaUnit,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  tone: 'default' | 'accent' | 'good';
  /** vs 지난 주 — 양수면 ↑, 음수면 ↓ */
  delta?: number;
  /** delta 단위 (h, %, %p, 건, '') */
  deltaUnit?: string;
}) {
  const valueClass =
    tone === 'good' ? 'text-pullim-success'
    : tone === 'accent' ? 'text-pullim-blue-600'
    : 'text-pullim-slate-900';
  const hasDelta = typeof delta === 'number';
  const isUp = hasDelta && delta > 0;
  const isDown = hasDelta && delta < 0;
  const deltaText = hasDelta
    ? `${isUp ? '↑' : isDown ? '↓' : '·'} ${Math.abs(delta).toFixed(Math.abs(delta) < 1 ? 1 : 0)}${deltaUnit ?? ''}`
    : null;
  return (
    <div className="bg-card rounded-xl border p-3">
      <div className="text-pullim-slate-500 inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div className={`mt-1 font-mono text-base font-bold ${valueClass}`}>{value}</div>
      <div className="text-pullim-slate-400 mt-0.5 text-[10px] flex items-center justify-between gap-1">
        <span className="truncate">{sub}</span>
        {deltaText && (
          <span
            className={cn(
              'font-mono font-semibold shrink-0',
              isUp ? 'text-pullim-success' : isDown ? 'text-pullim-warn' : 'text-pullim-slate-400',
            )}
            title="지난 주 대비"
          >
            {deltaText}
          </span>
        )}
      </div>
    </div>
  );
}

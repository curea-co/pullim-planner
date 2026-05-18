'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronDown, ChevronUp, BarChart3, Clock, Smile,
  Sparkles, AlertTriangle, CheckCircle2, ArrowRight, Flag,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  todayBlocks, dailyReflection, tomorrowDifferences,
  blockTypeMeta, subjectLabels, emotionEmojis,
  type TimeBlock, type ReflectionInsight,
} from '@/lib/mock';
import { cn } from '@/lib/utils';

const insightIcon: Record<ReflectionInsight['icon'], { Icon: LucideIcon; tone: string; bg: string }> = {
  sparkle: { Icon: Sparkles,        tone: 'text-pullim-blue-700',   bg: 'bg-pullim-blue-50' },
  check:   { Icon: CheckCircle2,    tone: 'text-pullim-success',    bg: 'bg-pullim-success-bg' },
  warn:    { Icon: AlertTriangle,   tone: 'text-pullim-warn',       bg: 'bg-pullim-warn-bg' },
};

/**
 * 일일 회고 — day view 하단 collapsed ribbon + 학습 완료 시 자동 expand.
 *
 * "오늘 무얼 했나" 메트릭 + 블록 회고 + "내일 뭐가 다른가" 인사이트.
 * 별도 라우트 만들지 않고 day view 안에서 처리. ribbon 패턴은 ConditionBurnoutPanel과 동일.
 *
 * id="today-reflection" — BlockCompleteDialog "오늘 학습 마감" CTA의 anchor scroll target.
 *
 * defaultOpen — reports day view 진입 시 펼친 상태로 시작 (true). 홈 day view는 미지정(기본 false, 학습 완료 시만 자동 펼침).
 */
export function TodayReflection({ defaultOpen }: { defaultOpen?: boolean } = {}) {
  const router = useRouter();
  const m = dailyReflection();
  const insights = tomorrowDifferences();

  // 학습 완료 시 자동 expand — 모든 학습 블록이 done/skipped일 때
  const allFinished = m.doingCount === 0 && m.todoCount === 0;
  const [open, setOpen] = useState(defaultOpen ?? allFinished);

  const avgEmotionEmoji =
    m.avgEmotion === null ? null
    : emotionEmojis[Math.round(m.avgEmotion) as 1 | 2 | 3 | 4 | 5];

  function handleClose() {
    toast.success('🌙 오늘 학습 마감', {
      description: '결과가 내일 플랜에 자동 반영돼요. 푹 쉬세요.',
      duration: 3500,
    });
    setOpen(false);
  }

  function handleTomorrow() {
    router.push('/planner/calendar?view=month');
  }

  return (
    <section
      id="today-reflection"
      className={cn('bg-card overflow-hidden rounded-xl border', open && 'shadow-pullim-sm')}
    >
      {/* Collapsed ribbon */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls="today-reflection-body"
        className={cn(
          'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pullim-blue-500',
          open ? 'bg-pullim-slate-50/60' : 'hover:bg-pullim-slate-50/40',
        )}
      >
        <span aria-hidden className="bg-pullim-blue-50 text-pullim-blue-700 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
          <BarChart3 className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-pullim-slate-500 text-[10px] font-bold tracking-wider uppercase">
            오늘 회고
          </div>
          <div className="text-pullim-slate-900 mt-0.5 text-sm font-bold">
            {m.completedCount}/{m.totalLearning} 완료
            {m.avgAccuracy !== null && (
              <>
                <span className="text-pullim-slate-400 mx-1.5 font-normal">·</span>
                <span className="text-pullim-blue-700 font-mono">{m.avgAccuracy}%</span>
              </>
            )}
            {avgEmotionEmoji && (
              <>
                <span className="text-pullim-slate-400 mx-1.5 font-normal">·</span>
                <span aria-label={`평균 감정 ${m.avgEmotion}/5`}>{avgEmotionEmoji}</span>
              </>
            )}
            {allFinished && (
              <span className="bg-pullim-success-bg text-pullim-success ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold">
                오늘 끝!
              </span>
            )}
          </div>
        </div>
        <span className="text-pullim-slate-500 inline-flex items-center gap-0.5 text-[11px] font-semibold">
          {open ? '접기' : '펼치기'}
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>

      {open && (
        <div id="today-reflection-body" className="space-y-5 border-t p-4">
          {/* 메트릭 3 */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Metric
              Icon={Clock}
              label="학습 시간"
              value={`${Math.floor(m.actualMin / 60)}h ${m.actualMin % 60}m`}
              sub={`/ ${Math.floor(m.plannedMin / 60)}h ${m.plannedMin % 60}m 계획`}
              tone="default"
            />
            <Metric
              Icon={BarChart3}
              label="평균 정확도"
              value={m.avgAccuracy === null ? '—' : `${m.avgAccuracy}%`}
              sub={`완료 ${m.completedCount}블록`}
              tone="accent"
            />
            <Metric
              Icon={Smile}
              label="감정 평균"
              value={
                m.avgEmotion === null
                  ? '—'
                  : `${avgEmotionEmoji} ${m.avgEmotion.toFixed(1)}`
              }
              sub="/ 5점 만점"
              tone="default"
            />
          </div>

          {/* 블록 회고 리스트 */}
          <section>
            <h4 className="text-pullim-slate-700 mb-2 text-[11px] font-bold tracking-wider uppercase">
              블록별 결과
            </h4>
            <ul className="space-y-1.5">
              {todayBlocks
                .filter(b => b.type !== 'break')
                .map(b => <BlockRow key={b.id} block={b} />)}
            </ul>
          </section>

          {/* 인사이트 */}
          <section>
            <h4 className="text-pullim-slate-700 mb-2 text-[11px] font-bold tracking-wider uppercase">
              내일 뭐가 다른가
            </h4>
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

          {/* CTA 2개 */}
          <footer className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleTomorrow}
              className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex flex-1 items-center justify-center gap-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-pullim-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 focus-visible:ring-offset-1"
            >
              <Flag className="h-3.5 w-3.5" />
              내일 캘린더 보기
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="bg-pullim-slate-100 text-pullim-slate-700 hover:bg-pullim-slate-200 inline-flex flex-1 items-center justify-center gap-1 rounded-xl px-4 py-2.5 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 focus-visible:ring-offset-1"
            >
              오늘 학습 마감
            </button>
          </footer>
        </div>
      )}
    </section>
  );
}

function Metric({
  Icon, label, value, sub, tone,
}: {
  Icon: LucideIcon; label: string; value: string; sub: string;
  tone: 'default' | 'accent';
}) {
  return (
    <div className="bg-pullim-slate-50 rounded-lg p-3">
      <div className="text-pullim-slate-500 inline-flex items-center gap-1 text-[10px] font-bold tracking-wider uppercase">
        <Icon className="h-3 w-3" />
        {label}
      </div>
      <div
        className={cn(
          'mt-1 font-mono text-lg font-bold',
          tone === 'accent' ? 'text-pullim-blue-600' : 'text-pullim-slate-900',
        )}
      >
        {value}
      </div>
      <div className="text-pullim-slate-400 text-[10px]">{sub}</div>
    </div>
  );
}

const statusBadge = {
  done:    { Icon: CheckCircle2, className: 'text-pullim-success bg-pullim-success-bg', label: '완료' },
  doing:   { Icon: Sparkles,     className: 'text-pullim-blue-700 bg-pullim-blue-100',  label: '진행' },
  todo:    { Icon: Clock,        className: 'text-pullim-slate-600 bg-pullim-slate-100', label: '대기' },
  skipped: { Icon: AlertTriangle, className: 'text-pullim-warn bg-pullim-warn-bg',       label: '미수행' },
} as const;

function BlockRow({ block }: { block: TimeBlock }) {
  const meta = blockTypeMeta[block.type];
  const TypeIcon = meta.Icon;
  const status = statusBadge[block.status];
  const StatusIcon = status.Icon;
  const subjectLabel = block.subject === 'rest' ? '휴식' : subjectLabels[block.subject];
  const emotionEmoji = block.emotion ? emotionEmojis[block.emotion] : null;
  const isDone = block.status === 'done';

  return (
    <li
      className={cn(
        'flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[11px]',
        isDone ? 'bg-pullim-slate-50/60 border-pullim-slate-200' : 'bg-card border-pullim-slate-200',
      )}
    >
      <span className={cn('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold', status.className)}>
        <StatusIcon className="h-2.5 w-2.5" />
        {status.label}
      </span>
      <span className="font-mono text-pullim-slate-500 w-20 shrink-0">
        {block.start}–{block.end}
      </span>
      <TypeIcon aria-hidden className="text-pullim-slate-500 h-3 w-3 shrink-0" />
      <span
        className={cn(
          'truncate font-semibold',
          isDone ? 'text-pullim-slate-500 line-through decoration-pullim-slate-300' : 'text-pullim-slate-900',
        )}
      >
        {block.title}
      </span>
      <span className="text-pullim-slate-400 ml-auto shrink-0 text-[10px]">{subjectLabel}</span>
      {block.accuracy !== undefined && (
        <span className="text-pullim-slate-700 font-mono shrink-0 text-[11px] font-bold">
          {block.accuracy}%
        </span>
      )}
      {emotionEmoji && <span aria-hidden className="shrink-0 text-sm">{emotionEmoji}</span>}
      {block.reasoning && (
        <span
          className="bg-pullim-blue-50 text-pullim-blue-700 inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
          title={block.reasoning}
        >
          <Sparkles className="h-2 w-2" aria-hidden />
          {block.reasoning}
        </span>
      )}
    </li>
  );
}

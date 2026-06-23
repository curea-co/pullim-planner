'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Clock, Eye, EyeOff, CalendarX2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  getBlocksForDayOffset, currentPersona, getDday, nextActiveBlock,
  blockTypeMeta, conditionMeta,
  hasQAccess, getBlockColor,
  type ConditionLevel, type BlockType, type TimeBlock,
} from '@/lib/mock';
import { getActiveCustomization } from '@/lib/hooks/use-planner-customization';
import { SectionHeading } from '@/components/shell/section-heading';
import { ActiveDayLayout } from '@/components/features/planner-home/components/layouts/active-day-layout';
import { ConditionBurnoutPanel } from '@/components/features/planner-home/components/condition-burnout-panel';
import { BlockCard } from '@/components/features/planner-home/components/block-card';
import { BlockCompleteDialog } from '@/components/features/planner-home/components/block-complete-dialog';
import { NextBlockHero } from '@/components/features/planner-home/components/next-block-hero';
import { TodayReflection } from '@/components/features/planner-home/components/today-reflection';

/** 완료한 블록 다음의 첫 학습 블록(휴식 제외, todo/doing) — 모달 CTA 라우팅용 */
function findFollowing(block: TimeBlock, blocks: TimeBlock[]): TimeBlock | null {
  const idx = blocks.findIndex(b => b.id === block.id);
  if (idx < 0) return null;
  for (let i = idx + 1; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.type !== 'break' && (b.status === 'todo' || b.status === 'doing')) return b;
  }
  return null;
}

const legendTypes: BlockType[] = ['concept', 'practice', 'review', 'memorize', 'mock', 'tutor', 'self_explain'];

interface DayViewProps {
  /** 날짜 이동 offset (0=기준일). 0 외에는 데모 플랜이 없어 빈 상태. */
  dayOffset?: number;
  /** 빈 상태에서 "오늘 계획 보기" — offset 0으로 리셋 */
  onResetToday?: () => void;
}

/** 일간 캘린더 본문 — 24h 시계 + 자기보고 패널 + 블록 리스트. */
export function DayView({ dayOffset = 0, onResetToday }: DayViewProps) {
  const [condition, setCondition] = useState<ConditionLevel>(3);
  const [showLegend, setShowLegend] = useState(false);
  const [trimTimeline, setTrimTimeline] = useState(true);
  const [completingBlock, setCompletingBlock] = useState<TimeBlock | null>(null);
  const dday = getDday(currentPersona);
  const ddayLabel = dday > 0 ? `D-${dday}` : dday === 0 ? 'D-DAY' : `D+${Math.abs(dday)}`;
  const blocks = getBlocksForDayOffset(dayOffset);
  const next = nextActiveBlock(blocks);
  const qAccess = hasQAccess();
  const { layoutId, paletteId } = getActiveCustomization();

  function notifyQNoAccess() {
    toast.info('🔒 풀림 Q 구독이 필요해요', {
      description: 'Q를 구독하면 학습 블록을 바로 풀이로 진행할 수 있어요.',
      duration: 3500,
    });
  }

  function onConditionChange(level: ConditionLevel) {
    setCondition(level);
    const meta = conditionMeta[level];
    toast(`${meta.emoji} ${meta.label}`, {
      id: `planner-condition-${level}`,
      description: `오늘 블록이 ${meta.difficultyAdj}로 자동 조정됐어요.`,
      duration: 2500,
    });
  }

  // 기준일(offset 0) 외에는 데모 플랜이 없어 빈 상태. BE 연동 시 그날 블록으로 대체.
  if (blocks.length === 0) {
    return (
      <div className="border-pullim-slate-200 bg-pullim-slate-50/50 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-16 text-center">
        <CalendarX2 className="text-pullim-slate-400 h-8 w-8" aria-hidden />
        <p className="text-pullim-slate-700 text-sm font-bold">이 날짜엔 아직 계획이 없어요</p>
        <p className="text-pullim-slate-500 text-xs">빌더에서 시간표를 만들면 이 날짜에도 블록이 채워져요.</p>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {onResetToday && (
            <button
              type="button"
              onClick={onResetToday}
              className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex items-center rounded-lg px-3 py-2 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-300"
            >
              오늘 계획 보기
            </button>
          )}
          <Link
            href="/planner/manage"
            className="text-pullim-blue-700 hover:bg-pullim-blue-50 inline-flex items-center rounded-lg px-3 py-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
          >
            시간표 관리
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]">
        <div className="space-y-4">
          {/* 시계 카드 — 색상 범례·트림은 헤더 토글로 collapse */}
          <section className="bg-card rounded-2xl border p-5">
            <header className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-pullim-slate-900 text-sm font-bold">오늘 일과</h3>
              <div className="flex items-center gap-3">
                {layoutId === 'vertical_timeline' && (
                  <button
                    type="button"
                    onClick={() => setTrimTimeline(t => !t)}
                    aria-pressed={!trimTimeline}
                    className="text-pullim-slate-500 hover:text-pullim-blue-700 inline-flex items-center gap-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 focus-visible:ring-offset-1 rounded"
                  >
                    <Clock className="h-3 w-3" />
                    {trimTimeline ? '전체 24h' : '핵심 시간만'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowLegend(s => !s)}
                  aria-expanded={showLegend}
                  aria-controls="day-clock-legend"
                  className="text-pullim-slate-500 hover:text-pullim-blue-700 inline-flex items-center gap-1 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 focus-visible:ring-offset-1 rounded"
                >
                  {showLegend ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  색상 범례
                </button>
              </div>
            </header>

            <ActiveDayLayout
              blocks={blocks}
              ddayLabel={ddayLabel}
              layoutId={layoutId}
              paletteId={paletteId}
              trimToBlocks={trimTimeline}
            />

            {next && (
              <NextBlockHero
                next={next}
                qAccess={qAccess}
                onNoAccess={notifyQNoAccess}
              />
            )}

            {showLegend && (
              <div
                id="day-clock-legend"
                className="border-pullim-slate-100 mt-3 flex flex-wrap gap-2 border-t pt-3"
              >
                {legendTypes.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 text-xs text-pullim-slate-500">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: getBlockColor(t, paletteId) }} />
                    {blockTypeMeta[t].label}
                  </span>
                ))}
              </div>
            )}
          </section>

          <ConditionBurnoutPanel
            condition={condition}
            onConditionChange={onConditionChange}
          />
        </div>

        <section>
          <SectionHeading
            title="오늘의 학습 블록"
            description="7대 교육학 엔진이 자동 적용된 학습 단위"
            action={
              <span
                className="text-pullim-slate-500 inline-flex items-center gap-0.5 text-xs font-semibold"
                title="드래그 정렬은 곧 열려요. 지금은 빌더에서 시간대를 조정하세요."
              >
                드래그 정렬 곧 열려요
              </span>
            }
          />
          <ol className="space-y-1.5">
            {blocks.map(b => (
              <li key={b.id}>
                <BlockCard block={b} onComplete={setCompletingBlock} variant="compact" />
              </li>
            ))}
          </ol>

          <div className="mt-4">
            <TodayReflection />
          </div>
        </section>
      </div>

      <BlockCompleteDialog
        block={completingBlock}
        nextBlock={completingBlock ? findFollowing(completingBlock, blocks) : null}
        onClose={() => setCompletingBlock(null)}
      />
    </div>
  );
}

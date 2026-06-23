'use client';

import { useState } from 'react';
import { Clock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import {
  todayBlocks, currentPersona, getDday, nextActiveBlock,
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
function findFollowing(block: TimeBlock): TimeBlock | null {
  const idx = todayBlocks.findIndex(b => b.id === block.id);
  if (idx < 0) return null;
  for (let i = idx + 1; i < todayBlocks.length; i++) {
    const b = todayBlocks[i];
    if (b.type !== 'break' && (b.status === 'todo' || b.status === 'doing')) return b;
  }
  return null;
}

const legendTypes: BlockType[] = ['concept', 'practice', 'review', 'memorize', 'mock', 'tutor', 'self_explain'];

/** 일간 캘린더 본문 — 24h 시계 + 자기보고 패널 + 블록 리스트. */
export function DayView() {
  const [condition, setCondition] = useState<ConditionLevel>(3);
  const [showLegend, setShowLegend] = useState(false);
  const [trimTimeline, setTrimTimeline] = useState(true);
  const [completingBlock, setCompletingBlock] = useState<TimeBlock | null>(null);
  const dday = getDday(currentPersona);
  const ddayLabel = dday > 0 ? `D-${dday}` : dday === 0 ? 'D-DAY' : `D+${Math.abs(dday)}`;
  const next = nextActiveBlock();
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
              blocks={todayBlocks}
              ddayLabel={ddayLabel}
              layoutId={layoutId}
              paletteId={paletteId}
              trimToBlocks={trimTimeline}
            />

            {next && (
              <NextBlockHero
                next={next}
                qAccess={qAccess}
                paletteId={paletteId}
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
            {todayBlocks.map(b => (
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
        nextBlock={completingBlock ? findFollowing(completingBlock) : null}
        onClose={() => setCompletingBlock(null)}
      />
    </div>
  );
}

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import {
  todayBlocks, currentPersona, getDday, nextActiveBlock,
  blockTypeMeta, subjectLabels, getFeatureRoute, conditionMeta,
  hasQAccess,
  type ConditionLevel, type BlockType, type TimeBlock,
} from '@/lib/mock';
import { SectionHeading } from '@/components/shell/section-heading';
import { SideTimeline24 } from '@/components/planner/side-timeline-24';
import { ConditionBurnoutPanel } from '@/components/planner/condition-burnout-panel';
import { BlockCard } from '@/components/planner/block-card';
import { BlockCompleteDialog } from '@/components/planner/block-complete-dialog';
import { TodayReflection } from '@/components/planner/today-reflection';
import { cn } from '@/lib/utils';

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
  const [completingBlock, setCompletingBlock] = useState<TimeBlock | null>(null);
  const dday = getDday(currentPersona);
  const ddayLabel = dday > 0 ? `D-${dday}` : dday === 0 ? 'D-DAY' : `D+${Math.abs(dday)}`;
  const next = nextActiveBlock();
  const NextIcon = next ? blockTypeMeta[next.type].Icon : null;
  const qAccess = hasQAccess();

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

  function onReorder() {
    toast.info('🛠️ 블록 순서 변경 — 준비 중', {
      description: '드래그 정렬은 곧 열려요. 지금은 빌더에서 시간대를 조정하세요.',
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[420px_1fr]">
        <div className="space-y-4">
          {/* 시계 카드 — 색상 범례는 chevron 토글로 collapse */}
          <section className="bg-card rounded-2xl border p-5">
            <header className="mb-3 flex items-center justify-between">
              <h3 className="text-pullim-slate-900 text-sm font-bold">오늘 일과</h3>
              <button
                type="button"
                onClick={() => setShowLegend(s => !s)}
                aria-expanded={showLegend}
                aria-controls="day-clock-legend"
                className="text-pullim-slate-500 hover:text-pullim-blue-700 inline-flex items-center gap-1 text-[11px] font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 focus-visible:ring-offset-1 rounded"
              >
                {showLegend ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                색상 범례
              </button>
            </header>

            <SideTimeline24 blocks={todayBlocks} ddayLabel={ddayLabel} />

            {next && NextIcon && (
              <div className="bg-pullim-blue-50 border-pullim-blue-100 mt-4 flex items-center gap-3 rounded-xl border p-3">
                <span className="bg-pullim-blue-100 text-pullim-blue-700 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" aria-hidden>
                  <NextIcon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-pullim-blue-700 text-[10px] font-bold tracking-wider uppercase">
                    다음 블록
                  </div>
                  <div className="text-pullim-slate-900 truncate text-sm font-bold">{next.title}</div>
                  <div className="text-pullim-slate-500 text-[11px]">
                    <span className="font-mono">{next.start}</span>
                    <span className="mx-1">·</span>
                    {next.subject !== 'rest' && subjectLabels[next.subject]}
                    <span className="mx-1">·</span>
                    {next.expectedMinutes}분
                  </div>
                </div>
                {qAccess ? (
                  <Link
                    href={next.linkedFeatureSlug ? getFeatureRoute(next.linkedFeatureSlug) : '#'}
                    className="bg-pullim-blue-600 inline-flex shrink-0 items-center gap-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm"
                  >
                    지금 시작
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={notifyQNoAccess}
                    aria-label="풀림 Q 미구독 — 클릭하면 구독 안내가 떠요"
                    className="bg-pullim-blue-600 inline-flex shrink-0 items-center gap-1 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm"
                  >
                    지금 시작
                  </button>
                )}
              </div>
            )}

            {showLegend && (
              <div
                id="day-clock-legend"
                className="border-pullim-slate-100 mt-3 flex flex-wrap gap-2 border-t pt-3"
              >
                {legendTypes.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 text-[10px] text-pullim-slate-500">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: blockTypeMeta[t].colorVar }} />
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
              <button
                type="button"
                onClick={onReorder}
                className={cn(
                  'text-pullim-blue-600 hover:text-pullim-blue-700 inline-flex items-center gap-0.5 text-xs font-semibold',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 focus-visible:ring-offset-1 rounded',
                )}
              >
                순서 변경 <ChevronRight className="h-3 w-3" />
              </button>
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

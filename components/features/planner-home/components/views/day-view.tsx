'use client';

import { useState } from 'react';
import { Clock, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import {
  getBlocksForDayOffset, currentPersona, getDday, nextActiveBlock,
  blockTypeMeta,
  hasQAccess, getBlockColor,
  type ConditionLevel, type BlockType, type TimeBlock,
} from '@/lib/mock';
import { getActiveCustomization, type Customization } from '@/lib/hooks/use-planner-customization';
import { SectionHeading } from '@/components/shell/section-heading';
import { ActiveDayLayout } from '@/components/features/planner-home/components/layouts/active-day-layout';
import { ConditionBurnoutPanel } from '@/components/features/planner-home/components/condition-burnout-panel';
import { BlockCard } from '@/components/features/planner-home/components/block-card';
import { BlockCompleteDialog } from '@/components/features/planner-home/components/block-complete-dialog';
import { NextBlockHero } from '@/components/features/planner-home/components/next-block-hero';
import { PeriodEmptyState } from '@/components/features/planner-home/components/period-empty-state';
import { TodayReflection } from '@/components/features/planner-home/components/today-reflection';
import { REFLECTION_ENABLED } from '@/lib/flags';

const legendTypes: BlockType[] = ['concept', 'practice', 'review', 'memorize', 'mock', 'tutor', 'self_explain'];

interface DayViewProps {
  /** 날짜 이동 offset (0=기준일). 0 외에는 데모 플랜이 없어 빈 상태. */
  dayOffset?: number;
  /** 빈 상태에서 "오늘 계획 보기" — offset 0으로 리셋 */
  onResetToday?: () => void;
  /** 실데이터(B4) — 미주입(dev bypass)이면 mock 폴백. */
  blocks?: TimeBlock[];
  /** 실데이터 D-day — blocks 와 함께 주입(미주입이면 mock persona 기준). */
  dday?: number;
  /** 블록 완료 기록 실 저장(#416) — 미주입이면 완료 다이얼로그가 데모(toast)로 동작. */
  onCompleteSubmit?: (blockId: string, input: { accuracy?: number; emotion?: number; notes?: string }) => Promise<boolean>;
  /** 실 active 플래너의 꾸미기(layout·palette) — 미주입(dev bypass)이면 mock getActiveCustomization 폴백. */
  customization?: Customization;
}

/** 일간 캘린더 본문 — 24h 시계 + 자기보고 패널 + 블록 리스트. */
export function DayView({ dayOffset = 0, onResetToday, blocks: blocksProp, dday: ddayProp, onCompleteSubmit, customization }: DayViewProps) {
  const [condition, setCondition] = useState<ConditionLevel>(3);
  const [showLegend, setShowLegend] = useState(false);
  const [trimTimeline, setTrimTimeline] = useState(true);
  const [completingBlock, setCompletingBlock] = useState<TimeBlock | null>(null);
  const dday = ddayProp ?? getDday(currentPersona);
  const ddayLabel = dday > 0 ? `D-${dday}` : dday === 0 ? 'D-DAY' : `D+${Math.abs(dday)}`;
  const blocks = blocksProp ?? getBlocksForDayOffset(dayOffset);
  const next = nextActiveBlock(blocks);
  const qAccess = hasQAccess();
  // 실데이터 주입 우선(홈 꾸미기 반영) — 미주입(dev bypass)이면 mock 폴백.
  const { layoutId, paletteId } = customization ?? getActiveCustomization();

  function notifyQNoAccess() {
    toast.info('🔒 풀림 Q와 연계한 서비스가 준비 중입니다.', {
      description: '열리면 학습 블록에서 바로 풀이로 이어져요.',
      duration: 3500,
    });
  }

  // QA #13 — 컨디션 선택 시 토스트 미노출. 선택 결과(난이도 조절)를 노골적으로 알리지 않는다.
  function onConditionChange(level: ConditionLevel) {
    setCondition(level);
  }

  if (blocks.length === 0) {
    // 기준일(offset 0)인데 비어 있으면 = 활성 시간표에 아직 블록이 없음(신규 — mock 미생성).
    // 잘못된 데모 블록을 보여주지 않고 정직한 빈 상태로 안내한다(실제 생성은 BE materialize).
    if (dayOffset === 0) {
      return (
        <PeriodEmptyState
          message="아직 학습 블록이 없어요"
          subMessage="활성화한 시간표의 블록은 곧 채워질 거예요."
        />
      );
    }
    // 기준일 외 날짜 — 데모 플랜이 없어 빈 상태. BE 연동 시 그날 블록으로 대체.
    return <PeriodEmptyState message="이 날짜엔 아직 계획이 없어요" onReset={onResetToday} />;
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

          {/* 회고 BE 미구현(REFLECTION_ENABLED off) — mock 계산을 실제처럼 노출하지 않게 숨김.
              위저드 STEP 6(약점)과 동일 맥락(07-10 QA). */}
          {REFLECTION_ENABLED && (
            <div className="mt-4">
              <TodayReflection />
            </div>
          )}
        </section>
      </div>

      <BlockCompleteDialog
        block={completingBlock}
        onClose={() => setCompletingBlock(null)}
        onSubmit={onCompleteSubmit}
      />
    </div>
  );
}

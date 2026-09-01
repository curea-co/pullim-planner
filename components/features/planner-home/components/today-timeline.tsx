'use client';

import { useRouter } from 'next/navigation';
import { ChevronRight } from 'lucide-react';
import {
  todayBlocks, blockTypeMeta, subjectLabels, getBlockColor, type TimeBlock,
} from '@/lib/mock';
import { getActiveCustomization } from '@/lib/hooks/use-planner-customization';
import { cn } from '@/lib/utils';

/**
 * 오늘 미니 타임라인 — 홈에서 "오늘의 흐름"을 한 줄로 보여준다.
 * 풀 캘린더로 가지 않고도 8개 블록의 시간·타입·상태를 한 눈에 인지.
 *
 * 칩 클릭 — 일간 캘린더로 이동 (해당 시각으로 스크롤은 향후 작업).
 */
export function TodayTimeline() {
  const router = useRouter();

  function openDay() {
    router.push('/planner/calendar?view=day');
  }

  return (
    <section className="bg-card rounded-xl border p-4">
      <header className="mb-2.5 flex items-center justify-between gap-2">
        <div>
          <h3 className="text-pullim-slate-900 text-sm font-bold">오늘의 흐름</h3>
          <p className="text-pullim-slate-500 text-[length:var(--text-xs)]">
            시간순 {todayBlocks.length}블록 · 칩을 누르면 일간 캘린더로
          </p>
        </div>
        <button
          type="button"
          onClick={openDay}
          className="text-pullim-blue-600 hover:text-pullim-blue-700 inline-flex items-center gap-0.5 text-[length:var(--text-xs)] font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 focus-visible:ring-offset-1 rounded"
        >
          캘린더에서 자세히
          <ChevronRight className="h-3 w-3" />
        </button>
      </header>

      <ol className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1.5">
        {todayBlocks.map(b => (
          <li key={b.id} className="shrink-0">
            <BlockChip block={b} onClick={openDay} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function BlockChip({ block, onClick }: { block: TimeBlock; onClick: () => void }) {
  const meta = blockTypeMeta[block.type];
  const Icon = meta.Icon;
  const subjectLabel = block.subject === 'rest' ? '휴식' : subjectLabels[block.subject];
  const { paletteId } = getActiveCustomization();

  // 상태별 톤 — 진행 중은 강조, 완료는 dim, 미수행은 warn
  const stateClass =
    block.status === 'doing'  ? 'border-pullim-blue-500 bg-pullim-blue-50 ring-1 ring-pullim-blue-300'
    : block.status === 'done' ? 'border-pullim-slate-200 bg-pullim-slate-50/60 opacity-70'
    : block.status === 'skipped' ? 'border-pullim-warn/40 bg-pullim-warn-bg'
    : 'border-pullim-slate-200 bg-card';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`${block.start}–${block.end} ${meta.label} ${block.title} (${block.status})`}
      title={`${block.title} · ${block.expectedMinutes}분`}
      className={cn(
        'flex flex-col items-start gap-1 rounded-lg border px-2.5 py-2 text-left transition-all',
        'hover:scale-[1.02] active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 focus-visible:ring-offset-1',
        stateClass,
      )}
    >
      <div className="flex items-center gap-1">
        <span
          className="inline-block h-2 w-2 rounded-sm"
          style={{ background: getBlockColor(block.type, paletteId) }}
          aria-hidden
        />
        <span className="text-pullim-slate-500 font-mono text-[length:var(--text-2xs)] font-bold">{block.start}</span>
      </div>
      <div className="flex items-center gap-1">
        <Icon
          aria-hidden
          className={cn(
            'h-3 w-3',
            block.status === 'doing' ? 'text-pullim-blue-700'
            : block.status === 'done' ? 'text-pullim-slate-400'
            : block.status === 'skipped' ? 'text-pullim-warn'
            : 'text-pullim-slate-600',
          )}
        />
        <span
          className={cn(
            'text-[length:var(--text-xs)] font-semibold whitespace-nowrap',
            block.status === 'doing' ? 'text-pullim-blue-700'
            : block.status === 'done' ? 'text-pullim-slate-500 line-through decoration-pullim-slate-300'
            : 'text-pullim-slate-700',
          )}
        >
          {subjectLabel}
        </span>
      </div>
    </button>
  );
}

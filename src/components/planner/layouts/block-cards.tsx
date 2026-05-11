'use client';

/**
 * 레이아웃 — 블록 카드 스택.
 * 시간 비율 무시, 일정마다 큰 카드 1개. 좌측 색띠 + 상단 시간 + 본문.
 * 노션·트렐로 느낌.
 */

import { blockTypeMeta, subjectLabels, getBlockColor, type TimeBlock, type PaletteId } from '@/lib/mock';
import { cn } from '@/lib/utils';

type Props = {
  blocks: TimeBlock[];
  paletteId?: PaletteId;
  compact?: boolean;
};

const STATUS_LABEL: Record<TimeBlock['status'], string> = {
  todo: '대기',
  doing: '진행',
  done: '완료',
  skipped: '미수행',
};

export function BlockCardsLayout({ blocks, paletteId, compact }: Props) {
  return (
    <ul
      className={cn(
        'border-pullim-slate-100 space-y-2 overflow-y-auto rounded-lg border bg-pullim-slate-25 p-2',
        compact ? 'max-h-[220px]' : 'max-h-[480px]',
      )}
      aria-label="시간표 블록 카드"
    >
      {blocks.map(b => {
        const meta = blockTypeMeta[b.type];
        const Icon = meta.Icon;
        const color = getBlockColor(b.type, paletteId);
        const subjectLabel = b.subject === 'rest' ? '휴식' : subjectLabels[b.subject];
        const isDone = b.status === 'done';
        const isDoing = b.status === 'doing';
        const isSkipped = b.status === 'skipped';

        return (
          <li
            key={b.id}
            className={cn(
              'relative overflow-hidden rounded-xl border bg-card shadow-sm',
              isDoing ? 'border-pullim-blue-400 ring-1 ring-pullim-blue-200' : 'border-pullim-slate-100',
              isDone && 'opacity-65',
              isSkipped && 'opacity-70',
            )}
          >
            {/* 좌측 색띠 */}
            <span
              aria-hidden
              className="absolute top-0 bottom-0 left-0 w-1.5"
              style={{ background: color }}
            />
            <div className="flex items-start gap-2.5 py-2.5 pr-3 pl-4">
              {/* 아이콘 */}
              <span
                aria-hidden
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
                style={{ background: color, opacity: 0.18 }}
              >
                <Icon className="h-3.5 w-3.5" style={{ color }} />
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-pullim-slate-700 font-mono text-[10px] font-bold">
                    {b.start}–{b.end}
                  </span>
                  <span className="text-pullim-slate-300 text-[10px]">·</span>
                  <span className="text-pullim-slate-500 text-[10px] font-semibold">
                    {b.expectedMinutes}분
                  </span>
                </div>
                <div
                  className={cn(
                    'text-pullim-slate-900 mt-0.5 truncate text-sm font-bold',
                    isDone && 'line-through decoration-pullim-slate-300',
                  )}
                >
                  {b.title}
                </div>
                <div className="text-pullim-slate-500 mt-0.5 truncate text-[11px]">
                  {meta.label} · {subjectLabel}
                </div>
              </div>

              {/* 상태 배지 */}
              <span
                className={cn(
                  'shrink-0 self-start rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase',
                  isDone
                    ? 'bg-pullim-success-bg text-pullim-success'
                    : isDoing
                    ? 'bg-pullim-blue-100 text-pullim-blue-700'
                    : isSkipped
                    ? 'bg-pullim-warn-bg text-pullim-warn'
                    : 'bg-pullim-slate-100 text-pullim-slate-600',
                )}
              >
                {STATUS_LABEL[b.status]}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

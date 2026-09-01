'use client';

/**
 * 레이아웃 — 체크리스트.
 * 시간 + 활동 줄 + 좌측 색 점 + 상태 체크박스. 다이어리·불릿저널 느낌.
 */

import { Check } from 'lucide-react';
import { blockTypeMeta, subjectLabels, getBlockColor, type TimeBlock, type PaletteId } from '@/lib/mock';
import { cn } from '@/lib/utils';

type Props = {
  blocks: TimeBlock[];
  paletteId?: PaletteId;
  compact?: boolean;
};

export function ChecklistLayout({ blocks, paletteId, compact }: Props) {
  return (
    <ol
      className={cn(
        'border-pullim-slate-100 overflow-y-auto rounded-lg border bg-card',
        compact ? 'max-h-[220px]' : 'max-h-[480px]',
      )}
      aria-label="시간표 체크리스트"
    >
      {blocks.map(b => {
        const meta = blockTypeMeta[b.type];
        const color = getBlockColor(b.type, paletteId);
        const subjectLabel = b.subject === 'rest' ? '휴식' : subjectLabels[b.subject];
        const isDone = b.status === 'done';
        const isDoing = b.status === 'doing';
        const isSkipped = b.status === 'skipped';
        return (
          <li
            key={b.id}
            className={cn(
              'border-pullim-slate-100 flex items-center gap-2.5 border-b px-3 py-2 last:border-b-0',
              isDoing && 'bg-pullim-blue-50/40',
              // 알파 대신 면으로 후퇴 (계약 §4.1). 상태는 취소선·체크박스가 나른다.
              (isDone || isSkipped) && 'bg-pullim-slate-50',
            )}
          >
            {/* 시간 */}
            <span className="text-pullim-slate-500 w-16 shrink-0 font-mono text-[length:var(--text-2xs)] font-bold">
              {b.start}
            </span>

            {/* 색 점 */}
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: color }}
            />

            {/* 활동 */}
            <div className="min-w-0 flex-1">
              <div
                className={cn(
                  'text-pullim-slate-900 truncate text-xs font-semibold',
                  isDone && 'line-through decoration-pullim-slate-300',
                )}
              >
                {b.title}
              </div>
              <div className="text-pullim-slate-500 truncate text-[length:var(--text-xs)]">
                {meta.label} · {subjectLabel} · {b.expectedMinutes}분
              </div>
            </div>

            {/* 체크박스 (상태 시각화) */}
            <span
              aria-hidden
              className={cn(
                'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                isDone
                  ? 'bg-pullim-success border-pullim-success text-white'
                  : isSkipped
                  ? 'border-pullim-warn bg-pullim-warn-bg'
                  : 'border-pullim-slate-300 bg-white',
              )}
            >
              {isDone && <Check className="h-3 w-3" />}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

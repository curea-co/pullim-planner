'use client';

/**
 * 레이아웃 — 파이 + 리스트.
 * 상단 도넛 차트(블록 타입별 시간 비중) + 하단 컴팩트 리스트.
 * 통계 요약형 공스타그램 스타일.
 */

import { blockTypeMeta, getBlockColor, type BlockType, type TimeBlock, type PaletteId } from '@/lib/mock';
import { cn } from '@/lib/utils';

type Props = {
  blocks: TimeBlock[];
  paletteId?: PaletteId;
  compact?: boolean;
};

type Segment = {
  type: BlockType;
  minutes: number;
  color: string;
  label: string;
};

const RADIUS = 38;
const STROKE = 14;
const C = 2 * Math.PI * RADIUS;

export function PieListLayout({ blocks, paletteId, compact }: Props) {
  // 블록 타입별 시간 집계 (휴식 제외해도 되지만 시각화엔 포함 — 일과 전체 = 100%)
  const totals = new Map<BlockType, number>();
  for (const b of blocks) {
    totals.set(b.type, (totals.get(b.type) ?? 0) + b.expectedMinutes);
  }
  const segments: Segment[] = Array.from(totals.entries())
    .filter(([, m]) => m > 0)
    .map(([type, minutes]) => ({
      type,
      minutes,
      color: getBlockColor(type, paletteId),
      label: blockTypeMeta[type].label,
    }))
    .sort((a, b) => b.minutes - a.minutes);

  const totalMin = segments.reduce((s, x) => s + x.minutes, 0) || 1;

  // 도넛 차트 — stroke-dasharray로 segment 누적 (functional accumulator로 immutability 유지)
  type RingSegment = Segment & { dash: string; offset: number };
  const ringSegments = segments.reduce<{ items: RingSegment[]; sum: number }>(
    (state, seg) => {
      const ratio = seg.minutes / totalMin;
      return {
        items: state.items.concat({
          ...seg,
          dash: `${ratio * C} ${C}`,
          offset: -state.sum * C,
        }),
        sum: state.sum + ratio,
      };
    },
    { items: [], sum: 0 },
  ).items;

  return (
    <div
      className={cn(
        'border-pullim-slate-100 overflow-hidden rounded-lg border bg-card',
        compact ? 'max-h-[220px] overflow-y-auto' : 'max-h-[480px] overflow-y-auto',
      )}
      aria-label="시간표 파이 + 리스트"
    >
      {/* 상단 — 도넛 + 합계 */}
      <div className="flex items-center gap-4 border-b border-pullim-slate-100 p-3">
        <svg width="96" height="96" viewBox="0 0 96 96" aria-hidden className="shrink-0">
          <g transform="translate(48 48) rotate(-90)">
            <circle r={RADIUS} fill="none" stroke="var(--color-pullim-slate-100)" strokeWidth={STROKE} />
            {ringSegments.map(seg => (
              <circle
                key={seg.type}
                r={RADIUS}
                fill="none"
                stroke={seg.color}
                strokeWidth={STROKE}
                strokeDasharray={seg.dash}
                strokeDashoffset={seg.offset}
              />
            ))}
          </g>
          <text
            x="48"
            y="48"
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-pullim-slate-900 font-mono font-bold"
            fontSize="12"
          >
            {(totalMin / 60).toFixed(1)}h
          </text>
        </svg>

        <div className="min-w-0 flex-1">
          <p className="text-pullim-slate-500 text-[10px] font-bold tracking-wider uppercase">
            오늘 학습 분포
          </p>
          <p className="text-pullim-slate-900 mt-0.5 text-sm font-bold">
            {blocks.length}개 블록 · {(totalMin / 60).toFixed(1)}시간
          </p>
          <p className="text-pullim-slate-500 mt-0.5 text-[11px]">
            도넛 = 블록 타입별 시간 비중
          </p>
        </div>
      </div>

      {/* 하단 — 컴팩트 리스트 */}
      <ul className="divide-y divide-pullim-slate-100">
        {segments.map(seg => {
          const pct = Math.round((seg.minutes / totalMin) * 100);
          return (
            <li key={seg.type} className="flex items-center gap-2 px-3 py-1.5">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ background: seg.color }}
              />
              <span className="text-pullim-slate-700 flex-1 truncate text-[11px] font-semibold">
                {seg.label}
              </span>
              <span className="text-pullim-slate-500 font-mono text-[10px]">
                {seg.minutes}분
              </span>
              <span className="text-pullim-slate-900 w-9 text-right font-mono text-[10px] font-bold">
                {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

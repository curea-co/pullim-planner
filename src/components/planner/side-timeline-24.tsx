'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { blockTypeMeta, plannerProgress, type TimeBlock } from '@/lib/mock';
import { cn } from '@/lib/utils';

const CELL_HEIGHT = 12;
const HALF_HOUR = 30;
const TOTAL_CELLS = (24 * 60) / HALF_HOUR; // 48
const HOURS = 24;

const STATUS_LABEL: Record<TimeBlock['status'], string> = {
  todo: '대기',
  doing: '진행',
  done: '완료',
  skipped: '미수행',
};

type Props = {
  blocks: TimeBlock[];
  /**
   * 현재 시각 (HH:MM) — 가로 라인 위치.
   * 미지정 시 클라이언트에서 매분 갱신. SSR 첫 페인트는 18:50 (데모 doing 블록과 정합).
   */
  now?: string;
  ddayLabel?: string;
  className?: string;
};

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function minutesToHHMM(min: number): string {
  return `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`;
}

/**
 * 24시간 사이드 트래커 — 좌 시간 라벨 + 우 분 단위 셀.
 * 풀림 플래너 일간 시각화의 표준(공스타그램 reference 50장 분석 기반).
 *
 * 시각: 셀 채색 = 학습 점유 시간 (형광펜 막대의 디지털 번역).
 * 30분 단위 셀, 00:00~24:00 풀. 첫 mount 시 06:00 부근으로 자동 스크롤.
 */
export function SideTimeline24({ blocks, now, ddayLabel, className }: Props) {
  // SSR/hydration mismatch 회피: 첫 페인트는 18:50 고정, 그 후 매분 갱신
  const [liveNow, setLiveNow] = useState<string>(now ?? '18:50');
  useEffect(() => {
    if (now) return;
    function tick() {
      const d = new Date();
      setLiveNow(`${pad2(d.getHours())}:${pad2(d.getMinutes())}`);
    }
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, [now]);

  const effectiveNow = now ?? liveNow;
  const nowMinutes = timeToMinutes(effectiveNow);
  const nowOffset = (nowMinutes / HALF_HOUR) * CELL_HEIGHT;

  const summary = plannerProgress(blocks);
  const doneMinutes = blocks
    .filter(b => b.status === 'done' || b.status === 'doing')
    .reduce((s, b) => s + b.expectedMinutes, 0);
  const expectedMinutes = blocks
    .filter(b => b.type !== 'break')
    .reduce((s, b) => s + b.expectedMinutes, 0);

  // 첫 mount 시 06:00 부근으로 스크롤 (새벽 빈 영역 가리기)
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 6 * 2 * CELL_HEIGHT - CELL_HEIGHT;
    }
  }, []);

  const cells = useMemo(() => {
    return Array.from({ length: TOTAL_CELLS }, (_, i) => {
      const cellStartMin = i * HALF_HOUR;
      const block = blocks.find(b => {
        const s = Math.floor(timeToMinutes(b.start) / HALF_HOUR);
        const e = Math.ceil(timeToMinutes(b.end) / HALF_HOUR) - 1;
        return i >= s && i <= e;
      });
      return { index: i, cellStartMin, block };
    });
  }, [blocks]);

  function cellTitle(cell: { cellStartMin: number; block?: TimeBlock }): string {
    if (cell.block) {
      return `${cell.block.start}–${cell.block.end} · ${cell.block.title} · ${STATUS_LABEL[cell.block.status]}`;
    }
    return minutesToHHMM(cell.cellStartMin);
  }

  function cellStyle(block?: TimeBlock): React.CSSProperties {
    if (!block) return {};
    if (block.type === 'break') {
      return { background: 'var(--color-pullim-slate-200)', opacity: 0.5 };
    }
    const color = blockTypeMeta[block.type].colorVar;
    if (block.status === 'skipped') {
      return {
        background: `repeating-linear-gradient(45deg, ${color} 0 3px, transparent 3px 6px)`,
        opacity: 0.55,
      };
    }
    const opacity = block.status === 'doing' ? 1 : block.status === 'done' ? 0.65 : 0.25;
    return { background: color, opacity };
  }

  return (
    <div className={cn('relative', className)}>
      {/* 헤더 위젯 — D-day · 누적 시간 · 완료 블록 */}
      <div className="mb-2 flex items-center gap-2">
        {ddayLabel && (
          <span className="text-pullim-blue-700 bg-pullim-blue-50 inline-flex rounded-full px-2 py-0.5 font-mono text-[10px] font-bold">
            {ddayLabel}
          </span>
        )}
        <span className="text-pullim-slate-700 font-mono text-[11px] font-semibold">
          {(doneMinutes / 60).toFixed(1)}h
          <span className="text-pullim-slate-400"> / {(expectedMinutes / 60).toFixed(1)}h</span>
        </span>
        <span className="text-pullim-slate-300 text-[11px]">·</span>
        <span className="text-pullim-slate-700 font-mono text-[11px] font-semibold">
          {summary.done}
          <span className="text-pullim-slate-400">/{summary.total} 블록</span>
        </span>
      </div>

      {/* 그리드 wrapper — 24h 풀 표시, 6시 부근부터 보이게 자동 scroll */}
      <div
        ref={scrollRef}
        className="border-pullim-slate-100 max-h-[480px] overflow-y-auto rounded-lg border"
        aria-label="24시간 학습 사이드 트래커"
      >
        <div className="relative flex" style={{ height: TOTAL_CELLS * CELL_HEIGHT }}>
          {/* 시간 라벨 컬럼 */}
          <div
            className="bg-pullim-slate-50 border-pullim-slate-100 w-8 shrink-0 border-r"
            aria-hidden
          >
            {Array.from({ length: HOURS }, (_, h) => (
              <div
                key={h}
                className="text-pullim-slate-500 flex items-start justify-center pt-0.5 font-mono text-[9px] font-semibold"
                style={{ height: 2 * CELL_HEIGHT }}
              >
                {pad2(h)}
              </div>
            ))}
          </div>

          {/* 분 단위 셀 컬럼 */}
          <div className="flex-1">
            {cells.map(c => {
              const isHourBoundary = c.index % 2 === 0;
              const isDoing = c.block?.status === 'doing';
              return (
                <div
                  key={c.index}
                  title={cellTitle(c)}
                  className={cn(
                    isHourBoundary && c.index !== 0 ? 'border-pullim-slate-100 border-t' : '',
                    isDoing ? 'border-pullim-blue-700 border-l-[3px]' : '',
                  )}
                  style={{ height: CELL_HEIGHT, ...cellStyle(c.block) }}
                  aria-hidden={!c.block}
                />
              );
            })}
          </div>

          {/* 현재 시각 가로 라인 */}
          <div
            className="border-pullim-danger pointer-events-none absolute right-0 left-0 z-10 border-t-[1.5px]"
            style={{ top: nowOffset }}
            aria-label={`현재 시각 ${effectiveNow}`}
          />
        </div>
      </div>
    </div>
  );
}

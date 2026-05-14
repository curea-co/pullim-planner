'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { plannerProgress, getBlockColor, type TimeBlock, type PaletteId } from '@/lib/mock';
import { getActiveCustomization } from '@/lib/hooks/use-planner-customization';
import { cn } from '@/lib/utils';

const CELL_HEIGHT = 12;
const HALF_HOUR = 30;
const FULL_CELLS = (24 * 60) / HALF_HOUR; // 48
const FULL_HOURS = 24;

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
  /** 색상 팔레트 override (미리보기용). 미지정 시 활성 플래너 팔레트. */
  paletteId?: PaletteId;
  /** 컴팩트 모드 — 미리보기 영역에서 헤더·스크롤·범례 축소 */
  compact?: boolean;
  /**
   * 첫 일정 1h 전 ~ 마지막 일정 1h 후로 표시 범위를 좁힌다.
   * day-view 진입 시 시각적 dead space 해소 — 토글로 전체 24h 복귀 가능.
   * blocks가 비면 풀 24h로 폴백.
   */
  trimToBlocks?: boolean;
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
export function SideTimeline24({ blocks, now, ddayLabel, className, paletteId, compact, trimToBlocks }: Props) {
  const activePalette = paletteId ?? getActiveCustomization().paletteId;
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

  // trim 활성 시 첫 일정 1h 전 ~ 마지막 일정 1h 후로 범위 좁힘. 시간 단위(60분)로 floor/ceil해 hour 라벨 정렬 보장.
  const range = useMemo(() => {
    if (!trimToBlocks || blocks.length === 0) {
      return { startMin: 0, startCell: 0, cellCount: FULL_CELLS, startHour: 0, hourCount: FULL_HOURS };
    }
    const firstMin = Math.min(...blocks.map(b => timeToMinutes(b.start)));
    const lastMin = Math.max(...blocks.map(b => timeToMinutes(b.end)));
    const startMin = Math.max(0, Math.floor((firstMin - 60) / 60) * 60);
    const endMin = Math.min(24 * 60, Math.ceil((lastMin + 60) / 60) * 60);
    return {
      startMin,
      startCell: startMin / HALF_HOUR,
      cellCount: (endMin - startMin) / HALF_HOUR,
      startHour: startMin / 60,
      hourCount: (endMin - startMin) / 60,
    };
  }, [blocks, trimToBlocks]);

  const nowOffsetRaw = ((nowMinutes - range.startMin) / HALF_HOUR) * CELL_HEIGHT;
  const nowVisible = nowOffsetRaw >= 0 && nowOffsetRaw <= range.cellCount * CELL_HEIGHT;

  const summary = plannerProgress(blocks);
  const doneMinutes = blocks
    .filter(b => b.status === 'done' || b.status === 'doing')
    .reduce((s, b) => s + b.expectedMinutes, 0);
  const expectedMinutes = blocks
    .filter(b => b.type !== 'break')
    .reduce((s, b) => s + b.expectedMinutes, 0);

  // 첫 mount 시 06:00 부근으로 스크롤 (새벽 빈 영역 가리기). trim 활성이면 이미 잘려 있으므로 불필요.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (trimToBlocks) return;
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 6 * 2 * CELL_HEIGHT - CELL_HEIGHT;
    }
  }, [trimToBlocks]);

  const cells = useMemo(() => {
    return Array.from({ length: range.cellCount }, (_, i) => {
      const absoluteIndex = range.startCell + i;
      const cellStartMin = absoluteIndex * HALF_HOUR;
      const block = blocks.find(b => {
        const s = Math.floor(timeToMinutes(b.start) / HALF_HOUR);
        const e = Math.ceil(timeToMinutes(b.end) / HALF_HOUR) - 1;
        return absoluteIndex >= s && absoluteIndex <= e;
      });
      return { index: i, absoluteIndex, cellStartMin, block };
    });
  }, [blocks, range.startCell, range.cellCount]);

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
    const color = getBlockColor(block.type, activePalette);
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
      {/* 헤더 위젯 — D-day · 누적 시간 · 완료 블록 (compact 모드 시 숨김) */}
      {!compact && (
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
      )}

      {/* 그리드 wrapper — trim 활성 시 첫·마지막 일정 ±1h만, 비활성 시 6시 부근부터 보이게 자동 scroll */}
      <div
        ref={scrollRef}
        className={cn(
          'border-pullim-slate-100 overflow-y-auto rounded-lg border',
          compact ? 'max-h-[220px]' : 'max-h-[480px]',
        )}
        aria-label={trimToBlocks ? '학습 사이드 트래커 (핵심 시간)' : '24시간 학습 사이드 트래커'}
      >
        <div className="relative flex" style={{ height: range.cellCount * CELL_HEIGHT }}>
          {/* 시간 라벨 컬럼 */}
          <div
            className="bg-pullim-slate-50 border-pullim-slate-100 w-8 shrink-0 border-r"
            aria-hidden
          >
            {Array.from({ length: range.hourCount }, (_, h) => (
              <div
                key={h}
                className="text-pullim-slate-500 flex items-start justify-center pt-0.5 font-mono text-[9px] font-semibold"
                style={{ height: 2 * CELL_HEIGHT }}
              >
                {pad2(range.startHour + h)}
              </div>
            ))}
          </div>

          {/* 분 단위 셀 컬럼 */}
          <div className="flex-1">
            {cells.map(c => {
              const isHourBoundary = c.absoluteIndex % 2 === 0;
              const isDoing = c.block?.status === 'doing';
              return (
                <div
                  key={c.absoluteIndex}
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

          {/* 현재 시각 가로 라인 — trim 범위 밖이면 숨김 */}
          {nowVisible && (
            <div
              className="border-pullim-danger pointer-events-none absolute right-0 left-0 z-10 border-t-[1.5px]"
              style={{ top: nowOffsetRaw }}
              aria-label={`현재 시각 ${effectiveNow}`}
            />
          )}
        </div>
      </div>
    </div>
  );
}

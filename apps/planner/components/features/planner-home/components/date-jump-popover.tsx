'use client';

import { useState, type ReactNode } from 'react';
import { Popover } from '@base-ui/react/popover';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

type Props = {
  /** offset 0 기준일 (planBaseDate, "YYYY-MM-DD") */
  baseISO: string;
  /** 현재 보고 있는 offset (0=기준일) */
  currentOffset: number;
  /** 날짜 선택 → 기준일 대비 offset 으로 점프 */
  onPick: (offset: number) => void;
  /** 트리거 라벨 — 페이저 가운데 날짜 텍스트 */
  children: ReactNode;
};

/** 로컬 자정 기준 일수 차 (b - a) */
function dayDiff(a: Date, b: Date): number {
  const am = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const bm = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((bm - am) / 86_400_000);
}

/**
 * 날짜 점프 달력 — 일간 페이저 가운데 라벨을 누르면 월 그리드가 열린다.
 * 기준일(planBaseDate=offset 0)에서 먼 날짜로 갈 때 "내일"을 여러 번 누르지 않게 한다.
 * 의존성 추가 없이 @base-ui Popover + 직접 만든 월 그리드.
 */
export function DateJumpPopover({ baseISO, currentOffset, onPick, children }: Props) {
  const [by, bm, bd] = baseISO.split('-').map(Number);
  const baseDate = new Date(by, bm - 1, bd);
  const currentDate = new Date(by, bm - 1, bd + currentOffset);

  const [open, setOpen] = useState(false);
  const [viewYM, setViewYM] = useState({ y: currentDate.getFullYear(), m: currentDate.getMonth() });

  function shiftMonth(delta: number) {
    setViewYM(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  }

  const { y, m } = viewYM;
  const firstDow = new Date(y, m, 1).getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstDow).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function pick(day: number) {
    onPick(dayDiff(baseDate, new Date(y, m, day)));
    setOpen(false);
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // 열 때마다 현재 보고 있는 달로 맞춤
        if (next) setViewYM({ y: currentDate.getFullYear(), m: currentDate.getMonth() });
      }}
    >
      <Popover.Trigger
        aria-label="날짜 선택 — 달력 열기"
        className="text-pullim-slate-700 hover:bg-pullim-slate-50 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
      >
        <CalendarDays className="text-pullim-slate-400 h-3.5 w-3.5" aria-hidden />
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} className="z-50">
          <Popover.Popup className="bg-popover text-popover-foreground w-[17rem] rounded-xl border p-3 shadow-md ring-1 ring-foreground/10 outline-none">
            <div className="mb-2 flex items-center justify-between">
              <button type="button" onClick={() => shiftMonth(-1)} aria-label="이전 달" className="hover:bg-pullim-slate-100 rounded-md p-1">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-pullim-slate-900 text-sm font-bold tabular-nums">{y}년 {m + 1}월</span>
              <button type="button" onClick={() => shiftMonth(1)} aria-label="다음 달" className="hover:bg-pullim-slate-100 rounded-md p-1">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="text-pullim-slate-400 mb-1 grid grid-cols-7 text-center text-[11px] font-bold">
              {WEEKDAYS.map((w) => <span key={w}>{w}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, i) => {
                if (day === null) return <span key={`pad-${i}`} aria-hidden />;
                const cellDate = new Date(y, m, day);
                const isBase = dayDiff(baseDate, cellDate) === 0;       // 기준일(오늘)
                const isSelected = dayDiff(currentDate, cellDate) === 0; // 현재 보는 날
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => pick(day)}
                    aria-label={`${y}년 ${m + 1}월 ${day}일`}
                    aria-current={isBase ? 'date' : undefined}
                    className={cn(
                      'flex h-8 items-center justify-center rounded-md text-xs font-semibold tabular-nums',
                      isSelected
                        ? 'bg-pullim-blue-600 text-white'
                        : isBase
                          ? 'bg-pullim-blue-50 text-pullim-blue-700'
                          : 'text-pullim-slate-700 hover:bg-pullim-slate-100',
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

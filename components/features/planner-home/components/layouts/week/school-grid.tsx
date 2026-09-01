'use client';

/**
 * 주간 레이아웃 — 학교형 교시×요일.
 * 1~9교시 × 월~일 격자. 셀=블록 타입 라벨 + 색 (학교 시간표 종이 느낌).
 *
 * 데이터: `weekView`(일별 블록 타입 카운트)를 9슬롯에 비례 배분.
 * 휴식 타입은 슬롯에서 제외. 비어 있는 슬롯은 자습으로 표시.
 */

import {
  weekView, blockTypeMeta, getBlockColor, type BlockType, type PaletteId, type WeekDay,
} from '@/lib/mock';
import { cn } from '@/lib/utils';

type Props = {
  paletteId?: PaletteId;
  compact?: boolean;
  /** 실데이터(B4) — 미주입이면 mock 데모(weekView) 폴백. */
  days?: WeekDay[];
};

const PERIOD_COUNT = 9;

type Cell = { type: BlockType | null };

/** 하루의 블록 카운트를 9교시 슬롯에 비례 배분. */
function buildDaySchedule(blocks: { type: BlockType; count: number; minutes: number }[]): Cell[] {
  const slots: Cell[] = Array.from({ length: PERIOD_COUNT }, () => ({ type: null }));
  const total = blocks.filter(b => b.type !== 'break').reduce((s, b) => s + b.minutes, 0);
  if (total === 0) return slots;

  // 각 블록 타입이 차지할 슬롯 수 — 비례 (최소 1)
  type Bucket = { type: BlockType; slotsNeeded: number };
  const buckets: Bucket[] = blocks
    .filter(b => b.type !== 'break' && b.minutes > 0)
    .map(b => ({
      type: b.type,
      slotsNeeded: Math.max(1, Math.round((b.minutes / total) * PERIOD_COUNT)),
    }));

  // 슬롯 합이 PERIOD_COUNT를 초과하면 가장 큰 bucket에서 차감
  let assignedCount = buckets.reduce((s, b) => s + b.slotsNeeded, 0);
  while (assignedCount > PERIOD_COUNT) {
    const biggest = buckets.reduce((max, b) => (b.slotsNeeded > max.slotsNeeded ? b : max), buckets[0]);
    biggest.slotsNeeded -= 1;
    assignedCount -= 1;
  }

  // 슬롯 채우기
  let idx = 0;
  for (const bucket of buckets) {
    for (let i = 0; i < bucket.slotsNeeded && idx < PERIOD_COUNT; i++) {
      slots[idx] = { type: bucket.type };
      idx += 1;
    }
  }
  return slots;
}

export function SchoolGridLayout({ paletteId, compact, days: daysProp }: Props) {
  // 각 요일을 9교시 슬롯으로 변환
  const days = (daysProp ?? weekView).map(d => ({
    day: d.day,
    date: d.date,
    isToday: d.isToday,
    schedule: buildDaySchedule(d.blocks),
  }));

  return (
    <section
      className={cn(
        'bg-card overflow-hidden rounded-2xl border',
        compact ? 'p-2' : 'p-3',
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-[length:var(--text-2xs)]">
          <thead>
            <tr>
              <th
                scope="col"
                className="bg-pullim-slate-50 text-pullim-slate-700 w-10 px-1 py-1.5 text-left font-semibold"
              >
                교시
              </th>
              {days.map(d => (
                <th
                  key={d.day}
                  scope="col"
                  className={cn(
                    'min-w-[40px] px-1 py-1.5 text-center font-semibold',
                    d.isToday ? 'bg-pullim-blue-50 text-pullim-blue-700' : 'bg-pullim-slate-50 text-pullim-slate-700',
                  )}
                >
                  <div>{d.day}</div>
                  <div className={cn(
                    'font-mono text-[length:var(--text-2xs)]',
                    d.isToday ? 'text-pullim-blue-700' : 'text-pullim-slate-500',
                  )}>
                    {d.date}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: PERIOD_COUNT }, (_, periodIdx) => (
              <tr key={periodIdx} className="border-pullim-slate-100 border-t">
                <th
                  scope="row"
                  className="text-pullim-slate-600 bg-pullim-slate-25 px-1 py-1 text-left font-mono text-[length:var(--text-2xs)] font-semibold"
                >
                  {periodIdx + 1}
                </th>
                {days.map(d => {
                  const cell = d.schedule[periodIdx];
                  if (!cell.type) {
                    return (
                      <td
                        key={d.day}
                        className="border-pullim-slate-100 border-l p-0.5"
                      >
                        <div className="bg-pullim-slate-25 text-pullim-slate-300 flex h-7 items-center justify-center rounded text-[length:var(--text-2xs)]">
                          자습
                        </div>
                      </td>
                    );
                  }
                  const color = getBlockColor(cell.type, paletteId);
                  const label = blockTypeMeta[cell.type].label;
                  return (
                    <td
                      key={d.day}
                      className="border-pullim-slate-100 border-l p-0.5"
                      title={label}
                    >
                      <div
                        className="text-pullim-slate-900 flex h-7 items-center justify-center rounded px-0.5 text-[length:var(--text-2xs)] font-semibold leading-tight"
                        style={{ background: color, opacity: 0.85 }}
                      >
                        <span className="truncate">{label}</span>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

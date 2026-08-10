'use client';

/**
 * 활성 주간 레이아웃 스위처 — weekLayoutId에 따라 4종 주간 레이아웃 중 하나를 렌더한다.
 * 미리보기에서 override 가능. `days`(실데이터, B4)는 각 레이아웃으로 관통 — 미주입이면 mock 데모.
 */

import type { PaletteId, WeekDay, WeekLayoutId } from '@/lib/mock';
import { MatrixByTypeLayout } from './week/matrix-by-type';
import { SchoolGridLayout } from './week/school-grid';
import { BarWeekLayout } from './week/bar-week';
import { HeatmapLayout } from './week/heatmap';

type Props = {
  weekLayoutId: WeekLayoutId;
  paletteId?: PaletteId;
  compact?: boolean;
  /** 실데이터(B4) 주간 집계 — 미주입이면 각 레이아웃이 mock 폴백. */
  days?: WeekDay[];
};

export function ActiveWeekLayout({ weekLayoutId, paletteId, compact, days }: Props) {
  switch (weekLayoutId) {
    case 'school_grid':
      return <SchoolGridLayout paletteId={paletteId} compact={compact} days={days} />;
    case 'bar_week':
      return <BarWeekLayout paletteId={paletteId} compact={compact} days={days} />;
    case 'heatmap':
      return <HeatmapLayout paletteId={paletteId} compact={compact} days={days} />;
    case 'matrix_by_type':
    default:
      return <MatrixByTypeLayout paletteId={paletteId} compact={compact} days={days} />;
  }
}

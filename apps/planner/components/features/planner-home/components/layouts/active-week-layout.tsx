'use client';

/**
 * 활성 주간 레이아웃 스위처 — weekLayoutId에 따라 4종 주간 레이아웃 중 하나를 렌더한다.
 * 미리보기에서 override 가능.
 */

import type { PaletteId, WeekLayoutId } from '@/lib/mock';
import { MatrixByTypeLayout } from './week/matrix-by-type';
import { SchoolGridLayout } from './week/school-grid';
import { BarWeekLayout } from './week/bar-week';
import { HeatmapLayout } from './week/heatmap';

type Props = {
  weekLayoutId: WeekLayoutId;
  paletteId?: PaletteId;
  compact?: boolean;
};

export function ActiveWeekLayout({ weekLayoutId, paletteId, compact }: Props) {
  switch (weekLayoutId) {
    case 'school_grid':
      return <SchoolGridLayout paletteId={paletteId} compact={compact} />;
    case 'bar_week':
      return <BarWeekLayout paletteId={paletteId} compact={compact} />;
    case 'heatmap':
      return <HeatmapLayout paletteId={paletteId} compact={compact} />;
    case 'matrix_by_type':
    default:
      return <MatrixByTypeLayout paletteId={paletteId} compact={compact} />;
  }
}

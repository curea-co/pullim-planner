'use client';

/**
 * 주간 레이아웃 — 타입×요일 매트릭스.
 * 기존 `WeekGrid` 컴포넌트를 그대로 래핑 (디폴트 템플릿).
 */

import { WeekGrid } from '@/components/features/planner-home/components/week-grid';
import type { PaletteId } from '@/lib/mock';

type Props = {
  paletteId?: PaletteId;
  compact?: boolean;
};

export function MatrixByTypeLayout({ paletteId, compact }: Props) {
  return <WeekGrid paletteId={paletteId} compact={compact} />;
}

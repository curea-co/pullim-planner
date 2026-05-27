'use client';

/**
 * 레이아웃 — 세로 타임라인.
 * 기존 SideTimeline24 컴포넌트를 그대로 사용 (디폴트 템플릿).
 */

import { SideTimeline24 } from '@/components/features/planner-home/components/side-timeline-24';
import type { TimeBlock, PaletteId } from '@/lib/mock';

type Props = {
  blocks: TimeBlock[];
  paletteId?: PaletteId;
  compact?: boolean;
  ddayLabel?: string;
  /** 첫 일정 1h 전 ~ 마지막 일정 1h 후로 좁힘. compact 또는 day-view 토글에서 활성. */
  trimToBlocks?: boolean;
};

export function VerticalTimelineLayout({ blocks, paletteId, compact, ddayLabel, trimToBlocks }: Props) {
  return (
    <SideTimeline24
      blocks={blocks}
      paletteId={paletteId}
      compact={compact}
      ddayLabel={ddayLabel}
      trimToBlocks={trimToBlocks}
    />
  );
}

'use client';

/**
 * 활성 레이아웃 스위처 — layoutId에 따라 4종 레이아웃 컴포넌트 중 하나를 렌더한다.
 * 활성 플래너의 customization을 그대로 따르거나, 미리보기에서 override 가능.
 */

import type { TimeBlock, PaletteId, LayoutTemplateId } from '@/lib/mock';
import { VerticalTimelineLayout } from './vertical-timeline';
import { ChecklistLayout } from './checklist';
import { BlockCardsLayout } from './block-cards';
import { PieListLayout } from './pie-list';

type Props = {
  blocks: TimeBlock[];
  layoutId: LayoutTemplateId;
  paletteId?: PaletteId;
  compact?: boolean;
  ddayLabel?: string;
};

export function ActiveDayLayout({ blocks, layoutId, paletteId, compact, ddayLabel }: Props) {
  switch (layoutId) {
    case 'checklist':
      return <ChecklistLayout blocks={blocks} paletteId={paletteId} compact={compact} />;
    case 'block_cards':
      return <BlockCardsLayout blocks={blocks} paletteId={paletteId} compact={compact} />;
    case 'pie_list':
      return <PieListLayout blocks={blocks} paletteId={paletteId} compact={compact} />;
    case 'vertical_timeline':
    default:
      return (
        <VerticalTimelineLayout
          blocks={blocks}
          paletteId={paletteId}
          compact={compact}
          ddayLabel={ddayLabel}
        />
      );
  }
}

/**
 * Mock 데이터 barrel export — 풀림 플래너 전용.
 */

export * from './persona';
export * from './curriculum';
export * from './planner';
export * from './family';
export * from './features';
export * from './subscriptions';

// 시간표 꾸미기 — 토큰/메타 (커스터마이즈에서 사용)
export {
  palettes,
  defaultPaletteId,
  paletteOrder,
  getBlockColor,
  type Palette,
  type PaletteId,
} from '@/lib/tokens/palettes';
export {
  layoutTemplates,
  defaultLayoutId,
  layoutOrder,
  type LayoutTemplateMeta,
  type LayoutTemplateId,
} from '@/lib/tokens/layout-templates';
export {
  weekLayouts,
  defaultWeekLayoutId,
  weekLayoutOrder,
  type WeekLayoutMeta,
  type WeekLayoutId,
} from '@/lib/tokens/week-layouts';

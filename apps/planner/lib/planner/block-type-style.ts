import type { BlockType } from '@/lib/mock';

/**
 * 블록 타입 → 좌측 stripe / 칩 배경 토큰 클래스 (팔레트 무관, DS 기본 톤).
 * `blockTypeMeta.colorVar` 의도를 Tailwind 클래스로. 인라인 style 없이 타입 색 정체성.
 * (next-block-hero의 TYPE_STRIPE와 동일 매핑 — 루틴 등 팔레트 비종속 화면에서 공용.)
 */
export const BLOCK_TYPE_STRIPE: Record<BlockType, string> = {
  concept: 'bg-pullim-blue-300',
  practice: 'bg-pullim-blue-700',
  review: 'bg-pullim-blue-900',
  memorize: 'bg-pullim-blue-200',
  mock: 'bg-pullim-blue-500',
  tutor: 'bg-pullim-blue-400',
  self_explain: 'bg-pullim-lemon',
  break: 'bg-pullim-slate-300',
};

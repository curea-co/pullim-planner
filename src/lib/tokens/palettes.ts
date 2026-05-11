/**
 * 시간표 꾸미기 — 블록 색상 팔레트 7종.
 *
 * 각 팔레트는 8종 블록 타입(BlockType)에 대한 hex 색상을 매핑한다.
 * pullim_blue 팔레트 = 기존 `blockTypeMeta.colorVar` 해석값과 동일 (디폴트 무변경).
 *
 * 추후 확장: 사용자 정의 팔레트 생성기, 토큰 시스템 편입.
 */

import type { BlockType } from '@/lib/mock/planner';

export type PaletteId =
  | 'pullim_blue'
  | 'forest'
  | 'sunset'
  | 'pastel'
  | 'mono'
  | 'mint'
  | 'rose';

export type Palette = {
  id: PaletteId;
  label: string;
  emoji: string;
  /** 8종 블록 타입별 hex 색상 */
  block: Record<BlockType, string>;
};

export const palettes: Record<PaletteId, Palette> = {
  pullim_blue: {
    id: 'pullim_blue',
    label: '풀림 블루',
    emoji: '🌊',
    block: {
      concept:      '#8BAEFF', // pullim-blue-300
      practice:     '#1D3FA8', // pullim-blue-700
      review:       '#0E1F54', // pullim-blue-900
      memorize:     '#B8CDFF', // pullim-blue-200
      mock:         '#3B6FF6', // pullim-blue-500
      tutor:        '#5A8BFF', // pullim-blue-400
      self_explain: '#E6FF4C', // pullim-lemon
      break:        '#C4CBDA', // pullim-slate-300
    },
  },
  forest: {
    id: 'forest',
    label: '포레스트',
    emoji: '🌲',
    block: {
      concept:      '#6BAA75',
      practice:     '#1F5F2E',
      review:       '#0B3D1B',
      memorize:     '#B5DDB8',
      mock:         '#3D8347',
      tutor:        '#8FCB97',
      self_explain: '#FFC857',
      break:        '#C7D1C7',
    },
  },
  sunset: {
    id: 'sunset',
    label: '선셋',
    emoji: '🌅',
    block: {
      concept:      '#FFB48F',
      practice:     '#C44536',
      review:       '#6B1D14',
      memorize:     '#FFD8B5',
      mock:         '#E8743E',
      tutor:        '#F4A372',
      self_explain: '#FFE66D',
      break:        '#D9C7BB',
    },
  },
  pastel: {
    id: 'pastel',
    label: '파스텔',
    emoji: '🌸',
    block: {
      concept:      '#B5C7F2',
      practice:     '#C8A2D8',
      review:       '#8A6FB3',
      memorize:     '#FFE2EC',
      mock:         '#FFB7C5',
      tutor:        '#B8E2F2',
      self_explain: '#FFF59D',
      break:        '#E8E1F0',
    },
  },
  mono: {
    id: 'mono',
    label: '모노',
    emoji: '⚫',
    block: {
      concept:      '#6B7280',
      practice:     '#1F2937',
      review:       '#0F172A',
      memorize:     '#D1D5DB',
      mock:         '#374151',
      tutor:        '#9CA3AF',
      self_explain: '#F59E0B', // 유일한 강조색 (액센트)
      break:        '#E5E7EB',
    },
  },
  mint: {
    id: 'mint',
    label: '민트',
    emoji: '🌿',
    block: {
      concept:      '#87CEAB',
      practice:     '#1E705E',
      review:       '#0B3E36',
      memorize:     '#C7EFE0',
      mock:         '#36A487',
      tutor:        '#5FB89E',
      self_explain: '#FFD166',
      break:        '#CFE0DA',
    },
  },
  rose: {
    id: 'rose',
    label: '로즈',
    emoji: '🌹',
    block: {
      concept:      '#F4A6BB',
      practice:     '#B6315A',
      review:       '#6B0E2C',
      memorize:     '#FBDAE5',
      mock:         '#D85179',
      tutor:        '#EF82A1',
      self_explain: '#FFC93C',
      break:        '#DFCED4',
    },
  },
};

export const defaultPaletteId: PaletteId = 'pullim_blue';

export const paletteOrder: PaletteId[] = [
  'pullim_blue', 'forest', 'sunset', 'pastel', 'mono', 'mint', 'rose',
];

/** 팔레트 + 블록 타입 → hex 색. 미지정 팔레트는 디폴트 사용. */
export function getBlockColor(type: BlockType, paletteId?: PaletteId): string {
  const palette = palettes[paletteId ?? defaultPaletteId];
  return palette.block[type];
}

/**
 * 공유(Study-gram) 도메인 — UI 상수 및 타입 re-export.
 * 기본 데이터 타입은 lib/mock/studygram에서 정의, 여기서 re-export.
 * Phase P0 완료 후 packages/types로 이전 예정.
 */

import type { PaletteId } from '@/lib/tokens/palettes';
import type { TonePresetId, Visibility } from '@/lib/mock/studygram';

export type { TonePresetId, Visibility, FriendshipStatus, ProofSnapshot, StudyProof, StudygramSetting, Friend } from '@/lib/mock/studygram';

/** 톤 프리셋 UI 표현 (emoji·label·description — UI 전용) */
export type TonePreset = {
  id: TonePresetId;
  label: string;
  emoji: string;
  description: string;
};

/** 톤 프리셋 → 팔레트 ID 매핑 */
export const TONE_TO_PALETTE: Record<TonePresetId, PaletteId> = {
  fancy:   'sunset',
  calm:    'mint',
  classic: 'pullim_blue',
  minimal: 'mono',
  soft:    'pastel',
};

export const TONE_PRESETS: TonePreset[] = [
  { id: 'fancy',   label: '화려하게', emoji: '🌅', description: '선셋 팔레트 — 따뜻하고 눈에 띄게' },
  { id: 'calm',    label: '차분하게', emoji: '🌿', description: '민트 팔레트 — 집중·안정감' },
  { id: 'classic', label: '클래식',   emoji: '🌊', description: '풀림 블루 — 익숙하고 깔끔하게' },
  { id: 'minimal', label: '미니멀',   emoji: '⚫', description: '모노 팔레트 — 군더더기 없이' },
  { id: 'soft',    label: '파스텔',   emoji: '🌸', description: '파스텔 팔레트 — 부드럽고 사랑스럽게' },
];

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  close_friends: '친한 친구',
  friends:       '친구 전체',
  private:       '나만 보기',
};

export const CONDITION_EMOJI: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: '😞',
  2: '😐',
  3: '🙂',
  4: '😊',
  5: '🔥',
};

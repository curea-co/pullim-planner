/**
 * 공유(Study-gram) 도메인 타입 — FE 로컬.
 * Phase P0 완료 후 packages/types로 이전 예정.
 */

import type { PaletteId } from '@/lib/tokens/palettes';

/** 톤 프리셋 5종 — spec §6 팔레트 매핑 */
export type TonePresetId = 'fancy' | 'calm' | 'classic' | 'minimal' | 'soft';

/** 톤 프리셋 → 팔레트 ID 매핑 */
export const TONE_TO_PALETTE: Record<TonePresetId, PaletteId> = {
  fancy:   'sunset',
  calm:    'mint',
  classic: 'pullim_blue',
  minimal: 'mono',
  soft:    'pastel',
};

export type TonePreset = {
  id: TonePresetId;
  label: string;
  emoji: string;
  description: string;
};

export const TONE_PRESETS: TonePreset[] = [
  { id: 'fancy',   label: '화려하게',   emoji: '🌅', description: '선셋 팔레트 — 따뜻하고 눈에 띄게' },
  { id: 'calm',    label: '차분하게',   emoji: '🌿', description: '민트 팔레트 — 집중·안정감' },
  { id: 'classic', label: '클래식',     emoji: '🌊', description: '풀림 블루 — 익숙하고 깔끔하게' },
  { id: 'minimal', label: '미니멀',     emoji: '⚫', description: '모노 팔레트 — 군더더기 없이' },
  { id: 'soft',    label: '파스텔',     emoji: '🌸', description: '파스텔 팔레트 — 부드럽고 사랑스럽게' },
];

/** 인증 카드 공개 범위 */
export type Visibility = 'close_friends' | 'friends' | 'private';

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  close_friends: '친한 친구',
  friends:       '친구 전체',
  private:       '나만 보기',
};

/** 인증 카드 결과 스냅샷 (생성 시점 동결 — spec BR-1) */
export type ProofSnapshot = {
  completedBlocks: number;
  totalBlocks: number;
  studyMinutes: number;
  accuracy?: number;
  condition: 1 | 2 | 3 | 4 | 5;
  reflectionLine: string;
  subjectTags: string[];
};

/** 하루 인증 카드 */
export type StudyProof = {
  id: string;
  userId: string;
  date: string;             // YYYY-MM-DD
  snapshot: ProofSnapshot;
  tonePresetId: TonePresetId;
  caption: string;
  visibility: Visibility;
  createdAt: string;
  reactionCount: number;
};

/** 공유 세팅 */
export type StudygramSetting = {
  topicLine: string;
  tonePresetId: TonePresetId;
  goalHorizonDays: number;
  goalPostsPerDay: number;
  consentGiven: boolean;
};

/** 친구 상태 */
export type FriendshipStatus = 'pending' | 'accepted' | 'blocked';

export type Friend = {
  id: string;
  userId: string;
  name: string;
  grade: string;
  isCloseFriend: boolean;
  status: FriendshipStatus;
  proofCount: number;
  latestProofDate?: string;
};

/** 컨디션 이모지 매핑 */
export const CONDITION_EMOJI: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: '😞',
  2: '😐',
  3: '🙂',
  4: '😊',
  5: '🔥',
};

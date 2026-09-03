import { Check, Clock, Pause, Play, type LucideIcon } from 'lucide-react';
import type { BlockType, TimeBlock } from '@/lib/mock';

/**
 * 블록의 시각 문법 한 벌 — 타입 색 · 상태 색 · 상태 칩.
 * 11-planner-design.md § 1(5단 상태 색문법) · § 5.1(타입별 컨테이너 색)의 Tailwind 구현체.
 *
 * 블록을 그리는 화면이 여럿(리스트 카드 · 완료 모달 · 루틴 · 빌더)이라 한 곳에 둔다.
 * 여기가 갈리면 "같은 블록인데 화면마다 다른 색"이 조용히 생긴다.
 */

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

/**
 * 블록 타입별 아이콘 컨테이너 색 (11-planner-design § 5.1).
 * mock-시간 학습 도메인 4개 + 회복/식사로 시각 차별화.
 * 모의평가만 warn 톤 — D-day 임박 신호와 톤 정합.
 */
export function getTypeContainerClass(type: BlockType): string {
  switch (type) {
    case 'mock':         return 'bg-pullim-warn-bg text-pullim-warn-ink';
    case 'memorize':     return 'bg-pullim-violet-50 text-pullim-violet-600';
    case 'concept':      return 'bg-pullim-teal-50 text-pullim-teal-600';
    case 'practice':     return 'bg-pullim-blue-50 text-pullim-blue-700';
    case 'review':       return 'bg-pullim-blue-100 text-pullim-blue-700';
    case 'tutor':        return 'bg-pullim-blue-50 text-pullim-blue-600';
    case 'self_explain': return 'bg-pullim-lemon-soft text-pullim-lemon-ink';
    case 'break':
    default:             return 'bg-pullim-slate-100 text-pullim-slate-700';
  }
}

/** 상태 칩 — '대기'(todo)는 기본 상태라 호출부에서 미노출(무표시=대기, 07-10 QA). */
export const BLOCK_STATUS_META: Record<
  TimeBlock['status'],
  { label: string; Icon: LucideIcon; className: string }
> = {
  done:    { label: '완료', Icon: Check, className: 'text-pullim-success-ink bg-pullim-success-bg' },
  doing:   { label: '진행', Icon: Pause, className: 'text-pullim-blue-700 bg-pullim-blue-100' },
  todo:    { label: '대기', Icon: Play,  className: 'text-pullim-slate-600 bg-pullim-slate-100' },
  skipped: { label: '이월', Icon: Clock, className: 'text-pullim-warn-ink bg-pullim-warn-bg' },
};

export type BlockVisual = {
  /** 좌측 4px stripe 배경 클래스 — null이면 stripe 없음 */
  stripe: string | null;
  /** 카드 면(배경 + 경계) 클래스 */
  surface: string;
  /** 사선 빗금 등 부가 패턴 — null이면 없음 */
  pattern: string | null;
};

/**
 * 5단 상태 색문법 (11-planner-design.md § 1)
 * 좌측 4px stripe + 카드 배경 톤을 한 곳에서 결정.
 * - completed: success-strong stripe, success-bg 옅은 면
 * - active (doing): brand-600 stripe, brand-50 면, ring 강조
 * - upcoming (todo): stripe 없음 (border만), 무톤
 * - overflow (skipped, 이월): warn stripe + 사선 빗금 + warn-bg 옅은 면
 * - recovery (break): stripe 없음, slate-100 면, pill radius
 */
export function getBlockVisual(status: TimeBlock['status'], isBreak: boolean): BlockVisual {
  if (isBreak) {
    return {
      stripe: null,
      surface: 'bg-pullim-slate-100/60 border-pullim-slate-200',
      pattern: null,
    };
  }
  switch (status) {
    case 'done':
      return {
        stripe: 'bg-pullim-success',
        surface: 'bg-pullim-success-bg/30 border-pullim-success/20',
        pattern: null,
      };
    case 'doing':
      return {
        stripe: 'bg-pullim-blue-600',
        surface: 'bg-pullim-blue-50/40 border-pullim-blue-300 ring-1 ring-pullim-blue-200 shadow-pullim-md',
        pattern: null,
      };
    case 'skipped':
      return {
        stripe: 'bg-pullim-warn',
        surface: 'bg-pullim-warn-bg/30 border-pullim-warn/30',
        // 사선 빗금 — 미수행/이월 신호
        pattern: 'before:absolute before:inset-0 before:rounded-[inherit] before:pointer-events-none before:bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgba(217,119,6,0.06)_6px_12px)]',
      };
    case 'todo':
    default:
      return {
        stripe: null,
        surface: 'bg-card hover:border-pullim-blue-200 border-pullim-slate-200',
        pattern: null,
      };
  }
}

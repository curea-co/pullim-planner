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
  /** 좌측 4px stripe 배경 클래스 — null이면 stripe 없음. 모든 표면에서 공통 */
  stripe: string | null;
  /**
   * **카드 전용** — 면(배경 + 경계 + ring + shadow) 클래스.
   * 다이얼로그에 그대로 넘기지 마라: 40% 알파 배경이 `bg-popover` 를 지워 모달이 반투명해지고,
   * `shadow-pullim-md` 가 `--shadow-lg` 를 눌러 부유감이 죽는다(tailwind-merge 실측).
   * 다이얼로그는 아래 `wash` 를 쓴다.
   */
  surface: string;
  /** **카드 전용** — 사선 빗금 등 부가 패턴. null이면 없음 */
  pattern: string | null;
  /**
   * **다이얼로그/시트 전용** — 헤더 상단에 얹는 상태 톤 그라디언트의 시작색.
   * 카드의 `surface` 틴트에 대응하는 표현이다. 카드는 면 전체를 물들이지만 모달은
   * 불투명한 표면과 자체 elevation 을 지켜야 해서, 같은 상태색을 헤더에서만 흘린다.
   * `bg-gradient-to-b <wash> to-transparent` 로 쓴다. null이면 무톤(카드의 todo 와 같다).
   */
  wash: string | null;
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
      wash: 'from-pullim-slate-100/70',
    };
  }
  switch (status) {
    case 'done':
      return {
        stripe: 'bg-pullim-success',
        surface: 'bg-pullim-success-bg/30 border-pullim-success/20',
        pattern: null,
        wash: 'from-pullim-success-bg/60',
      };
    case 'doing':
      return {
        stripe: 'bg-pullim-blue-600',
        surface: 'bg-pullim-blue-50/40 border-pullim-blue-300 ring-1 ring-pullim-blue-200 shadow-pullim-md',
        pattern: null,
        wash: 'from-pullim-blue-50/70',
      };
    case 'skipped':
      return {
        stripe: 'bg-pullim-warn',
        surface: 'bg-pullim-warn-bg/30 border-pullim-warn/30',
        // 사선 빗금 — 미수행/이월 신호
        pattern: 'before:absolute before:inset-0 before:rounded-[inherit] before:pointer-events-none before:bg-[repeating-linear-gradient(135deg,transparent_0_6px,rgba(217,119,6,0.06)_6px_12px)]',
        wash: 'from-pullim-warn-bg/60',
      };
    case 'todo':
    default:
      return {
        stripe: null,
        surface: 'bg-card hover:border-pullim-blue-200 border-pullim-slate-200',
        pattern: null,
        // todo 는 기본 상태 — 카드가 무톤인 것과 같이 모달도 물들이지 않는다
        wash: null,
      };
  }
}

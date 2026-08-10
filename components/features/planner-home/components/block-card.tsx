'use client';

import Link from 'next/link';
import {
  Play, Check, Pause, ArrowRight, Clock, Lock,
  CheckCircle2, Sparkles,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  blockTypeMeta,
  emotionEmojis,
  subjectLabels,
  findFeature,
  getFeatureRoute,
  hasQAccess,
  type TimeBlock,
  type BlockType,
} from '@/lib/mock';
import { Progress } from '@/components/ui/progress';
import { PedagogyTag } from './pedagogy-tag';
import { Q_LINK_ENABLED } from '@/lib/flags';
import { cn } from '@/lib/utils';

const statusMeta = {
  done:    { label: '완료',  Icon: Check,  className: 'text-pullim-success bg-pullim-success-bg' },
  doing:   { label: '진행',  Icon: Pause,  className: 'text-pullim-blue-700 bg-pullim-blue-100' },
  todo:    { label: '대기',  Icon: Play,   className: 'text-pullim-slate-600 bg-pullim-slate-100' },
  skipped: { label: '이월', Icon: Clock,  className: 'text-pullim-warn bg-pullim-warn-bg' },
} as const;

/**
 * 5단 상태 색문법 (11-planner-design.md § 1)
 * 좌측 4px stripe + 카드 배경 톤을 한 곳에서 결정.
 * - completed: success-strong stripe, success-bg 옅은 면
 * - active (doing): brand-600 stripe, brand-50 면, ring 강조
 * - upcoming (todo): stripe 없음 (border만), 무톤
 * - overflow (skipped, 이월): warn-cta-bg stripe + 사선 빗금 + warn-bg 옅은 면
 * - recovery (break): stripe 없음, slate-100 면, pill radius
 */
function getBlockVisual(status: TimeBlock['status'], isBreak: boolean) {
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
        stripe: 'bg-pullim-warn-cta-bg',
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

/**
 * 연결된 기능이 출시 전(future stage)이면 진입을 막는다.
 * `findFeature`가 known feature를 찾았을 때만 잠금 판정 — alias slug
 * (`memory/conqueror/exam` 등)는 features에 없지만 `getFeatureRoute`가
 * 안전한 라우트로 매핑하므로 잠금 아님.
 */
function isLockedSlug(slug: string | undefined): boolean {
  if (!slug) return false;
  const f = findFeature(slug);
  return f?.stage === 'future';
}

/**
 * 블록 타입별 아이콘 컨테이너 색 (11-planner-design § 5.1).
 * mock-시간 학습 도메인 4개 + 회복/식사로 시각 차별화.
 * 모의평가만 warn 톤 — D-day 임박 신호와 톤 정합.
 */
function getTypeContainerClass(type: BlockType): string {
  switch (type) {
    case 'mock':         return 'bg-pullim-warn-bg text-pullim-warn-cta-bg';
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

/** "HH:MM"에 분 단위 더하기 — 모달/토스트 카피용 데모 헬퍼 */
/* ─── 공유 헬퍼 — full / compact 양쪽에서 동일 동작 ──────────────── */

function notifyLockedAction(e: React.MouseEvent) {
  e.preventDefault();
  toast.info('🔒 출시 준비 중', {
    description: '이 학습 자원은 곧 열려요. 다른 블록부터 진행하세요.',
  });
}

function notifyQNoAccess() {
  toast.info('🔒 풀림 Q와 연계한 서비스가 준비 중입니다.', {
    description: '열리면 학습 블록에서 바로 풀이로 이어져요.',
    duration: 3500,
  });
}

type Props = {
  block: TimeBlock;
  /** 학생이 케밥 → "완료 처리"를 누르면 호출. day-view가 받아 모달을 연다. */
  onComplete?: (block: TimeBlock) => void;
  /**
   * 'card' (기본) — 풀 카드: 헤더 + 본문 + reasoning + 엔진 태그 + CTA
   * 'compact' — 한 줄 행: 시간 · 아이콘 · 제목 · 상태 · CTA. 좌측 시간표와 높이 정합용.
   */
  variant?: 'card' | 'compact';
};

/**
 * 단일 블록 카드 — 오늘의 학습 블록 리스트.
 * 시작/이어서/완료 상태별로 다른 톤·CTA + 완료 체크(상시 노출) + 비통상 reasoning 라벨.
 * (케밥 액션(미루기/스킵)은 미동작 데모라 QA #11에서 제거.)
 *
 * variant='compact' — day-view 우측에서 좌측 시간표와 높이 정합 위해 행 형태로 압축.
 */
export function BlockCard({ block, onComplete, variant = 'card' }: Props) {
  if (variant === 'compact') {
    return <BlockCardCompact block={block} onComplete={onComplete} />;
  }
  return <BlockCardFull block={block} onComplete={onComplete} />;
}

function BlockCardFull({ block, onComplete }: Props) {
  const subjectLabel = block.subject === 'rest' ? '휴식' : subjectLabels[block.subject];
  const meta = blockTypeMeta[block.type];
  const TypeIcon = meta.Icon;
  const status = statusMeta[block.status];
  const StatusIcon = status.Icon;
  const emotionEmoji = block.emotion ? emotionEmojis[block.emotion] : null;
  const isActive = block.status === 'doing';
  const isDone = block.status === 'done';
  const isBreak = block.type === 'break';

  const locked = isLockedSlug(block.linkedFeatureSlug);
  const target = block.linkedFeatureSlug && !locked ? getFeatureRoute(block.linkedFeatureSlug) : '#';
  const qAccess = hasQAccess();

  const onCompleteAction = () => { if (onComplete) onComplete(block); };

  const visual = getBlockVisual(block.status, isBreak);

  return (
    <article
      className={cn(
        'relative rounded-xl border p-3.5 pl-4 transition-all',
        visual.surface,
        visual.pattern,
      )}
    >
      {/* 좌측 4px stripe — 5단 상태 색문법 */}
      {visual.stripe && (
        <span aria-hidden className={cn('absolute left-0 top-2 bottom-2 w-1 rounded-r', visual.stripe)} />
      )}
      {/* 헤더: 시간·과목·상태·케밥 */}
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold">
        <span className="font-mono text-pullim-slate-700">
          {block.start}–{block.end}
        </span>
        <span className="text-pullim-slate-300">·</span>
        <span className="text-pullim-slate-500">{block.expectedMinutes}분</span>
        <span className="text-pullim-slate-300">·</span>
        <span className="text-pullim-slate-700">{subjectLabel}</span>
        {/* 우측 정렬 spacer — 상태 칩이 조건부라 ml-auto를 칩에 두면 todo 에서 정렬이 깨진다(Codex) */}
        <span className="ml-auto" aria-hidden />
        {/* 상태 칩 — '대기'(todo)는 기본 상태라 칩 미노출(무표시=대기, 07-10 QA) */}
        {block.status !== 'todo' && (
          <span className={cn('inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px]', status.className)}>
            <StatusIcon className="h-2.5 w-2.5" />
            {status.label}
          </span>
        )}
        {/* 완료 체크 — 케밥에 숨기지 않고 상시 노출 (완료 처리 접근성 QA 2026-07-10) */}
        {!isBreak && !isDone && (
          <button
            type="button"
            onClick={onCompleteAction}
            aria-label={`${block.title} 완료 처리`}
            title="완료 처리"
            className="text-pullim-slate-400 hover:bg-pullim-success-bg hover:text-pullim-success inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>

      {/* 본문 */}
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            'relative inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
            getTypeContainerClass(block.type),
          )}
          style={{ opacity: isDone ? 0.6 : 1 }}
        >
          <TypeIcon className="h-4 w-4" />
          {/* 모의평가 — 우상단 D-day 점 표시 (실제 시험 일자는 §2.2 칩으로 헤더에 노출) */}
          {block.type === 'mock' && (
            <span aria-hidden className="bg-pullim-danger absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-card" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-pullim-slate-500 text-[10px] font-semibold tracking-wider uppercase">
            {meta.label}
          </div>
          <h3 className={cn(
            'truncate text-sm font-bold',
            isDone ? 'text-pullim-slate-500 line-through decoration-pullim-slate-300' : 'text-pullim-slate-900',
          )}>
            {block.title}
          </h3>
        </div>
        {/* 완료 시 정확도/감정 */}
        {isDone && block.accuracy !== undefined && (
          <div className="text-right">
            <div className="text-pullim-slate-900 font-mono text-sm font-bold">{block.accuracy}%</div>
            {emotionEmoji && <span aria-hidden className="ml-auto block text-base leading-none">{emotionEmoji}</span>}
          </div>
        )}
      </div>

      {/* 진행 바 + 우측 wedge 텍스트 (active일 때만) */}
      {isActive && (
        <div className="mt-2.5 flex items-center gap-2">
          <Progress value={block.progress * 100} className="h-1.5 flex-1" />
          <span className="text-pullim-blue-700 shrink-0 font-mono text-[11px] font-bold tabular-nums">
            {Math.round(block.progress * 100)}%
          </span>
        </div>
      )}

      {/* 엔진 태그 + reasoning + CTA */}
      {!isBreak && (
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            {block.reasoning && (
              <span
                className="bg-pullim-blue-50 text-pullim-blue-700 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold"
                title="이 블록이 여기 있는 이유"
              >
                <Sparkles className="h-2.5 w-2.5" aria-hidden />
                {block.reasoning}
              </span>
            )}
            {block.engines.slice(0, 2).map(e => (
              <PedagogyTag key={e} engineId={e} />
            ))}
            {block.engines.length > 2 && (
              <span className="text-pullim-slate-500 text-[10px]">+{block.engines.length - 2}</span>
            )}
          </div>
          {/* 잠금(자원 출시 전) 표시는 Q 연계와 별개라 유지. 시작/이어서 CTA 만
              Q_LINK_ENABLED off 시 숨김 — 준비 중 안내뿐인 버튼 미노출(07-10 QA, Codex) */}
          {!isDone && (
            locked ? (
              <button
                type="button"
                onClick={notifyLockedAction}
                className="bg-pullim-slate-50 text-pullim-slate-400 inline-flex cursor-not-allowed items-center gap-1 rounded-lg px-4 py-2.5 text-sm font-semibold"
                aria-label="출시 준비 중인 자원 — 진입 불가"
              >
                <Lock className="h-3.5 w-3.5" />
                준비 중
              </button>
            ) : !Q_LINK_ENABLED ? null : qAccess ? (
              <Link
                href={target}
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-pullim-blue-600 text-white hover:bg-pullim-blue-700'
                    : 'bg-pullim-slate-100 text-pullim-slate-700 hover:bg-pullim-slate-200',
                )}
              >
                {isActive ? '이어서' : '시작'}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={notifyQNoAccess}
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors',
                  isActive
                    ? 'bg-pullim-blue-600 text-white hover:bg-pullim-blue-700'
                    : 'bg-pullim-slate-100 text-pullim-slate-700 hover:bg-pullim-slate-200',
                )}
                aria-label="풀림 Q 연계 준비 중 — 클릭하면 안내가 떠요"
              >
                {isActive ? '이어서' : '시작'}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )
          )}
        </div>
      )}
    </article>
  );
}

/* ─── compact 행 — day-view 우측에서 좌측 시간표와 높이 정합 ──────── */

function BlockCardCompact({ block, onComplete }: Props) {
  const meta = blockTypeMeta[block.type];
  const TypeIcon = meta.Icon;
  const status = statusMeta[block.status];
  const StatusIcon = status.Icon;
  const emotionEmoji = block.emotion ? emotionEmojis[block.emotion] : null;
  const isActive = block.status === 'doing';
  const isDone = block.status === 'done';
  const isBreak = block.type === 'break';

  const locked = isLockedSlug(block.linkedFeatureSlug);
  const target = block.linkedFeatureSlug && !locked ? getFeatureRoute(block.linkedFeatureSlug) : '#';
  const qAccess = hasQAccess();

  const onCompleteAction = () => { if (onComplete) onComplete(block); };

  const visual = getBlockVisual(block.status, isBreak);

  return (
    <article
      className={cn(
        'group relative flex flex-col rounded-lg border px-2.5 py-2 pl-3 transition-all',
        // compact는 shadow-pullim-md를 제외 (시간표 행 정합 유지)
        visual.surface.replace('shadow-pullim-md', ''),
        visual.pattern,
      )}
    >
      {/* 좌측 4px stripe — 5단 상태 색문법 */}
      {visual.stripe && (
        <span aria-hidden className={cn('absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r', visual.stripe)} />
      )}
      <div className="flex items-center gap-2">
        {/* 시간 */}
        <span className="text-pullim-slate-700 shrink-0 font-mono text-[10px] font-bold tabular-nums">
          {block.start}
        </span>

        {/* 타입 아이콘 — type별 컨테이너 색 (§ 5.1) */}
        <span
          className={cn(
            'relative inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
            getTypeContainerClass(block.type),
          )}
          aria-hidden
          title={meta.label}
        >
          <TypeIcon className={cn('h-3.5 w-3.5', isDone && 'opacity-60')} />
          {block.type === 'mock' && (
            <span aria-hidden className="bg-pullim-danger absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full ring-1 ring-card" />
          )}
        </span>

        {/* 제목 + reasoning chip */}
        <div className="min-w-0 flex-1">
          <h3
            className={cn(
              'truncate text-[12.5px] font-semibold leading-tight',
              isDone ? 'text-pullim-slate-500 line-through decoration-pullim-slate-300' : 'text-pullim-slate-900',
            )}
            title={block.title}
          >
            {block.title}
          </h3>
          {block.reasoning && (
            <span
              className="text-pullim-blue-700 mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-semibold"
              title="이 블록이 여기 있는 이유"
            >
              <Sparkles className="h-2.5 w-2.5" aria-hidden />
              {block.reasoning}
            </span>
          )}
        </div>

        {/* 완료 시 정확도/감정 */}
        {isDone && block.accuracy !== undefined && (
          <span className="text-pullim-slate-700 shrink-0 font-mono text-[11px] font-bold">
            {block.accuracy}%
            {emotionEmoji && <span aria-hidden className="ml-1 text-sm">{emotionEmoji}</span>}
          </span>
        )}

        {/* 상태 칩 — '대기'(todo)는 기본 상태라 칩 미노출(무표시=대기, 07-10 QA) */}
        {block.status !== 'todo' && (
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold',
              status.className,
            )}
          >
            <StatusIcon className="h-2.5 w-2.5" />
            {status.label}
          </span>
        )}

        {/* CTA — 진행 중·대기일 때만. 잠금 표시는 유지, 시작/이어서만 Q_LINK_ENABLED off 시 숨김 */}
        {!isDone && !isBreak && (
          locked ? (
            <button
              type="button"
              onClick={notifyLockedAction}
              className="bg-pullim-slate-50 text-pullim-slate-400 inline-flex cursor-not-allowed shrink-0 items-center gap-0.5 rounded-md px-2 py-1 text-[11px] font-bold"
              aria-label="출시 준비 중"
            >
              <Lock className="h-3 w-3" />
              준비 중
            </button>
          ) : !Q_LINK_ENABLED ? null : qAccess ? (
            <Link
              href={target}
              className={cn(
                'inline-flex shrink-0 items-center gap-0.5 rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors',
                isActive
                  ? 'bg-pullim-blue-600 text-white hover:bg-pullim-blue-700'
                  : 'bg-pullim-slate-100 text-pullim-slate-700 hover:bg-pullim-slate-200',
              )}
            >
              {isActive ? '이어서' : '시작'}
              <ArrowRight className="h-3 w-3" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={notifyQNoAccess}
              className={cn(
                'inline-flex shrink-0 items-center gap-0.5 rounded-md px-2.5 py-1 text-[11px] font-bold transition-colors',
                isActive
                  ? 'bg-pullim-blue-600 text-white hover:bg-pullim-blue-700'
                  : 'bg-pullim-slate-100 text-pullim-slate-700 hover:bg-pullim-slate-200',
              )}
              aria-label="풀림 Q 연계 준비 중 — 클릭하면 안내가 떠요"
            >
              {isActive ? '이어서' : '시작'}
              <ArrowRight className="h-3 w-3" />
            </button>
          )
        )}

        {/* 완료 체크 — 케밥에 숨기지 않고 상시 노출 (완료 처리 접근성 QA 2026-07-10) */}
        {!isBreak && !isDone && (
          <button
            type="button"
            onClick={onCompleteAction}
            aria-label={`${block.title} 완료 처리`}
            title="완료 처리"
            className="text-pullim-slate-400 hover:bg-pullim-success-bg hover:text-pullim-success inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}

      </div>

      {/* progress bar (active일 때만, 행 하단 1px 라인) */}
      {isActive && (
        <div className="bg-pullim-slate-100 mt-1.5 h-0.5 overflow-hidden rounded-full">
          <div
            className="bg-pullim-blue-500 h-full"
            style={{ width: `${Math.round(block.progress * 100)}%` }}
          />
        </div>
      )}
    </article>
  );
}

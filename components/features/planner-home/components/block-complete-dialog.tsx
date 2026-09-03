'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import {
  blockTypeMeta, subjectLabels, emotionEmojis,
  type BlockType, type TimeBlock,
} from '@/lib/mock';
import {
  BLOCK_STATUS_META, getBlockVisual, getTypeContainerClass,
} from '@/lib/planner/block-type-style';
import {
  Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PedagogyTag } from './pedagogy-tag';
import { cn } from '@/lib/utils';

type Emotion = 1 | 2 | 3 | 4 | 5;

type Props = {
  /** 완료 처리할 블록 — null이면 모달 닫힘 */
  block: TimeBlock | null;
  onClose: () => void;
  /**
   * 완료 기록 실 저장(pullim-api #416) — 성공 true/실패 false. 미주입(dev bypass·mock)이면
   * 저장 없이 데모(toast) 흐름 유지. 실패 시 모달을 닫지 않아 재시도 가능.
   */
  onSubmit?: (blockId: string, input: { accuracy?: number; emotion?: number; notes?: string }) => Promise<boolean>;
};

const emotionLabel: Record<Emotion, string> = {
  1: '많이 힘들었어요',
  2: '조금 힘들었어요',
  3: '보통이었어요',
  4: '괜찮았어요',
  5: '잘 풀렸어요',
};

/**
 * 블록 완료 모달 — "5초 안에 닫을 수 있는" 마이크로 인터랙션.
 * 핵심 플라이휠 표면 — 학생이 *완료를 보고하고*, 그 결과(감정·시간·정확도)가
 * 내일 플랜 재최적화의 입력이 됨. 실모드는 `onSubmit`(pullim-api 완료 기록 upsert)로
 * 영속하고, 미주입(dev bypass·mock)이면 기존 데모(toast) 흐름 그대로.
 *
 * ── 디자인: 「카드의 연장」 (2026-09-02 시안 A) ───────────────────────────
 * 모달은 새 화면이 아니라 **방금 누른 그 블록 카드가 확대된 것**이다. 그래서 색·배치를
 * 새로 정하지 않고 `lib/planner/block-type-style` 의 시각 문법을 그대로 물려받는다 —
 * 좌측 4px 상태 stripe · 타입별 아이콘 컨테이너 색 · mono meta 행 · 상태 칩 · 진행 바.
 * 리스트 행과 같은 함수를 쓰므로 todo·doing·done·skipped·break 5개 상태가 자동으로 맞는다.
 *
 * 톤은 둘뿐이다: 지배 톤 = 블록의 상태색, 완료 CTA = success.
 * CTA 색이 5단 색문법의 `done` 칩 색과 같아서 "누르면 이 색이 된다"는 뜻을 갖는다.
 * (이전 lemon CTA 는 상태색과 무관해 근거가 없었다.)
 *
 * CTA는 두 개뿐 (QA #12 — 기대대로 동작하지 않던 종료/5분 휴식/다음 블록 시작 제거):
 * - 닫기: 완료 처리하지 않고 팝업만 닫음
 * - 완료: 완료 처리(저장) 후 팝업 닫음. 감정·코멘트는 선택적
 */
export function BlockCompleteDialog({ block, onClose, onSubmit }: Props) {
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  // 새 블록이 열릴 때 입력 초기화 — render 중 setState로 cascading effect 회피
  const [prevId, setPrevId] = useState<string | null>(null);
  if (block && block.id !== prevId) {
    setPrevId(block.id);
    setEmotion(null);
    setNote('');
  }

  if (!block) {
    return (
      <Dialog open={false} onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="hidden" />
      </Dialog>
    );
  }

  // 모르는 type 이면 조회가 undefined 다 — 경계(home-data)가 이미 접어 주지만,
  // mock·테스트·향후 호출부가 우회할 수 있어 여기서도 죽지 않게 둔다.
  const meta = blockTypeMeta[block.type] as typeof blockTypeMeta[BlockType] | undefined;
  const TypeIcon = meta?.Icon;
  const subjectLabel = block.subject === 'rest' ? '휴식' : subjectLabels[block.subject];
  const emotionEmoji = emotion ? emotionEmojis[emotion] : null;
  const isBreak = block.type === 'break';
  const isActive = block.status === 'doing';
  // 실데이터 방어 — home-data.ts 는 pullim-api JSON 을 검증 없이 단언한다
  // (`b.status as …`, `b.engines as …`). BE 가 값을 빠뜨리거나 모르는 상태를 보내면
  // 여기서 undefined 가 되므로, 없으면 그 조각만 접는다. 모달 전체가 죽으면 안 된다.
  const status = BLOCK_STATUS_META[block.status] as typeof BLOCK_STATUS_META[keyof typeof BLOCK_STATUS_META] | undefined;
  const engines = block.engines ?? [];
  const progressPct = Number.isFinite(block.progress) ? Math.round(block.progress * 100) : 0;
  // 리스트 행과 같은 함수 — 여기가 갈리면 "같은 블록인데 화면마다 다른 색"이 된다.
  // surface·pattern 은 카드 전용이라 받지 않는다: surface 의 40% 알파 배경이 bg-popover 를 지워
  // 모달이 반투명해지고(뒤 화면이 비친다) shadow-pullim-md 가 --shadow-lg 를 눌러 부유감이
  // 죽는다. pattern 의 사선 빗금도 입력 폼 전면에 깔 것이 못 된다.
  // 상태 톤은 stripe(공통) + wash(다이얼로그용 헤더 그라디언트)로 전달한다.
  const { stripe, wash } = getBlockVisual(block.status, isBreak);

  function summary(): string {
    const emotionPart = emotion ? ` · ${emotionEmoji}` : '';
    return `✓ ${block!.title}${emotionPart}`;
  }

  /**
   * 완료 기록 저장 — "완료" CTA의 선행 단계.
   * onSubmit 미주입(데모)이면 즉시 true. 실패(false)면 모달을 닫지 않는다(재시도).
   */
  async function persist(): Promise<boolean> {
    if (!onSubmit || !block) return true;
    setSaving(true);
    try {
      return await onSubmit(block.id, {
        ...(block.accuracy !== undefined ? { accuracy: block.accuracy } : {}),
        ...(emotion !== null ? { emotion } : {}),
        ...(note.trim() ? { notes: note.trim() } : {}),
      });
    } finally {
      setSaving(false);
    }
  }

  /** "완료" — 완료 처리(저장) 후 팝업 닫기 (QA #12) */
  async function handleComplete() {
    if (!(await persist())) return;
    toast.success(summary(), {
      description: '완료를 기록했어요 — 내일 플랜에 반영돼요.',
      duration: 3000,
    });
    onClose();
  }

  return (
    // 저장 중(backdrop 클릭·ESC) dismiss 무시 — 실패 시 모달 유지(재시도) 보장이 깨지지 않게(Codex #137 R2)
    <Dialog open={!!block} onOpenChange={(o) => { if (!o && !saving) onClose(); }}>
      <DialogContent
        className={cn(
          // 주변 카드(rounded-2xl)와 같은 16px — 기본 12px는 "다른 시스템에서 온 것"처럼 읽힌다
          'max-w-md rounded-[var(--puds-radius-xl)]',
          // 모바일은 리스트에서 이어지는 바텀 시트. 같은 DOM에 반응형 유틸리티만 — 모달 portal과
          // 충돌하는 CSS hidden 분기(AGENTS.md §10)가 아니라 위치·라운드만 바꾼다.
          'max-sm:top-auto max-sm:bottom-0 max-sm:max-h-[85dvh] max-sm:w-full max-sm:max-w-none',
          'max-sm:translate-y-0 max-sm:rounded-b-none max-sm:data-open:slide-in-from-bottom-4',
        )}
      >
        {/* 좌측 4px 상태 stripe — 리스트 행과 같은 색문법. 모달 전 높이를 타고 내려간다 */}
        {stripe && (
          <span aria-hidden className={cn('absolute left-0 top-0 bottom-0 z-10 w-1', stripe)} />
        )}

        {/* 헤더 — 블록 카드의 meta 행 순서 그대로. blue wash는 띠가 아니라 아래로 사라지는
            그라디언트라 본문과 사이에 경계선이 생기지 않는다(bg-muted 단차 제거) */}
        <DialogHeader className={cn('gap-2.5 pb-4', wash && `bg-gradient-to-b ${wash} to-transparent`)}>
          <div className="flex items-center gap-2 text-[length:var(--text-xs)] font-semibold">
            <span className="text-pullim-slate-700 font-mono tabular-nums">
              {block.start}–{block.end}
            </span>
            <span className="text-pullim-slate-300">·</span>
            <span className="text-pullim-slate-500">{block.expectedMinutes}분</span>
            <span className="text-pullim-slate-300">·</span>
            <span className="text-pullim-slate-700">{subjectLabel}</span>
            <span className="ml-auto" aria-hidden />
            {/* 상태 칩 — '대기'(todo)는 기본 상태라 미노출(무표시=대기, 07-10 QA).
                닫기(X) 버튼과 겹치지 않게 오른쪽 여백을 둔다 */}
            {block.status !== 'todo' && status && (
              <span className={cn('mr-7 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5', status.className)}>
                <status.Icon className="h-2.5 w-2.5" />
                {status.label}
              </span>
            )}
          </div>

          <DialogTitle className="flex items-start gap-2.5">
            {/* 타입별 컨테이너 색 — 무채색 고정을 버렸다. 어떤 블록을 눌렀는지 모달만 봐도 안다 */}
            <span
              className={cn(
                'relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                getTypeContainerClass(block.type),
              )}
              aria-hidden
            >
              {TypeIcon && <TypeIcon className="h-4 w-4" />}
              {block.type === 'mock' && (
                <span aria-hidden className="bg-pullim-danger ring-card absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full ring-2" />
              )}
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="text-pullim-slate-500 block text-[length:var(--text-xs)] font-semibold tracking-wider uppercase">
                {meta?.label}
              </span>
              <span className="text-pullim-slate-900 block text-sm font-bold">{block.title}</span>
            </span>
          </DialogTitle>

          {/* 진행 바 — 카드와 같이 doing일 때만 */}
          {isActive && (
            <div className="flex items-center gap-2">
              <Progress value={progressPct} className="h-1.5 flex-1" />
              <span className="text-pullim-blue-700 shrink-0 font-mono text-[length:var(--text-2xs)] font-bold tabular-nums">
                {progressPct}%
              </span>
            </div>
          )}

          {/* reasoning 칩 + 엔진 태그 — 카드와 같은 자리, 같은 순서 */}
          {!isBreak && (block.reasoning || engines.length > 0) && (
            <div className="flex flex-wrap items-center gap-1">
              {block.reasoning && (
                <span
                  className="bg-pullim-blue-50 text-pullim-blue-700 inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[length:var(--text-xs)] font-bold"
                  title="이 블록이 여기 있는 이유"
                >
                  <Sparkles className="h-2.5 w-2.5" aria-hidden />
                  {block.reasoning}
                </span>
              )}
              {engines.slice(0, 2).map(e => (
                <PedagogyTag key={e} engineId={e} />
              ))}
              {engines.length > 2 && (
                <span className="text-pullim-slate-500 text-[length:var(--text-2xs)]">
                  +{engines.length - 2}
                </span>
              )}
            </div>
          )}

          <DialogDescription className="sr-only">
            {block.title} 완료 기록 — 감정과 메모는 선택 입력입니다.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="gap-5 py-3">
          {/* 감정 체크인 — 선택적. ConditionBurnoutPanel 과 같은 관용구(트랙 위 선택 칩) */}
          <section>
            <label className="text-pullim-slate-700 mb-2 block text-[length:var(--text-xs)] font-bold tracking-wider uppercase">
              오늘 이 블록은 어땠어요? <span className="text-pullim-slate-400 font-normal normal-case">(선택)</span>
            </label>
            <div
              role="radiogroup"
              aria-label="감정 체크인"
              className="bg-pullim-slate-50 flex items-center gap-1.5 rounded-xl p-1.5"
            >
              {([1, 2, 3, 4, 5] as Emotion[]).map(level => {
                const selected = emotion === level;
                return (
                  <button
                    key={level}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={emotionLabel[level]}
                    onClick={() => setEmotion(level)}
                    className={cn(
                      'flex flex-1 items-center justify-center rounded-lg py-2.5 transition-all',
                      'focus-visible:ring-pullim-blue-500 focus-visible:ring-offset-1 focus-visible:ring-2 focus-visible:outline-none',
                      selected
                        ? 'bg-card ring-pullim-blue-500 shadow-pullim-sm ring-2'
                        : 'opacity-55 grayscale hover:opacity-100 hover:grayscale-0',
                    )}
                  >
                    <span aria-hidden className="text-xl leading-none">{emotionEmojis[level]}</span>
                  </button>
                );
              })}
            </div>
            {/* 높이 고정 — 선택 전후로 레이아웃이 튀지 않게 */}
            <p className="text-pullim-blue-700 mt-2 h-4 text-[length:var(--text-xs)] font-semibold">
              {emotion ? emotionLabel[emotion] : ''}
            </p>
          </section>

          {/* 한 줄 코멘트 — 선택적 */}
          <section>
            <label
              htmlFor="block-complete-note"
              className="text-pullim-slate-700 mb-2 block text-[length:var(--text-xs)] font-bold tracking-wider uppercase"
            >
              한 줄 메모 <span className="text-pullim-slate-400 font-normal normal-case">(선택)</span>
            </label>
            <input
              id="block-complete-note"
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="예: 첫 문제는 헷갈렸지만 마지막은 빠르게"
              maxLength={60}
              className="border-pullim-slate-200 focus-visible:border-pullim-blue-400 bg-card w-full rounded-lg border px-3 py-2.5 text-sm outline-none"
            />
          </section>
        </DialogBody>

        {/* QA #12 — 닫기(완료 처리 없이 닫기) / 완료(완료 처리 후 닫기) 두 CTA만.
            푸터는 bg-muted 띠를 벗고 본문과 같은 면에 hairline 한 줄로만 나뉜다 */}
        <DialogFooter
          className={cn(
            'bg-popover gap-2 py-3.5 rounded-b-[var(--puds-radius-xl)] max-sm:rounded-b-none',
            // 기본 flex-col-reverse 는 모바일에서 완료를 닫기 *위*로 올린다.
            // 바텀 시트에선 한 줄로 두고 완료가 남는 폭을 채우는 게 A안 배치다.
            'flex-row justify-end',
          )}
        >
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            닫기
          </Button>
          <Button
            type="button"
            onClick={handleComplete}
            disabled={saving}
            // 색은 PUDS 가 정한다 — Button 기본 variant 가 --color-action-primary 를 쓴다
            // (pullim-os: primary-600/흰글자, 다크: primary-400/gray-950 로 자동 반전).
            className="max-sm:flex-1"
          >
            {saving ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden />
            )}
            {saving ? '저장 중…' : '완료'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

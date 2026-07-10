'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Clock, Coffee, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  blockTypeMeta, subjectLabels, emotionEmojis, getFeatureRoute,
  hasQAccess,
  type TimeBlock,
} from '@/lib/mock';
import {
  Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Emotion = 1 | 2 | 3 | 4 | 5;

type Props = {
  /** 완료 처리할 블록 — null이면 모달 닫힘 */
  block: TimeBlock | null;
  onClose: () => void;
  /** 다음으로 진행할 블록 — 있으면 "다음 블록 시작" CTA에 사용 */
  nextBlock?: TimeBlock | null;
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
 * 내일 플랜 재최적화의 입력이 됨 (데모 단계는 toast로 표현).
 *
 * 감정·코멘트는 선택적. "종료" CTA로 즉시 빠져나갈 수 있음.
 */
export function BlockCompleteDialog({ block, onClose, nextBlock }: Props) {
  const router = useRouter();
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [note, setNote] = useState('');

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

  const meta = blockTypeMeta[block.type];
  const TypeIcon = meta.Icon;
  const subjectLabel = block.subject === 'rest' ? '휴식' : subjectLabels[block.subject];
  const emotionEmoji = emotion ? emotionEmojis[emotion] : null;

  function summary(): string {
    const emotionPart = emotion ? ` · ${emotionEmoji}` : '';
    const accPart = block!.accuracy ? ` · ${block!.accuracy}점` : '';
    return `✓ ${block!.title}${accPart}${emotionPart}`;
  }

  function handleNext() {
    toast.success(summary(), {
      description: nextBlock
        ? `다음 블록(${nextBlock.start})으로 넘어가요`
        : '다음 블록으로 넘어가요',
      duration: 3000,
    });
    onClose();
    if (nextBlock?.linkedFeatureSlug) {
      // Q 연계 미개통이면 라우트 이동 대신 준비 중 안내. 다음 블록 자체는 플래너 안에서 자연 진행.
      if (!hasQAccess()) {
        toast.info('🔒 풀림 Q와 연계한 서비스가 준비 중입니다.', {
          description: '열리면 다음 블록에서 바로 풀이로 이어져요.',
          duration: 3500,
        });
        return;
      }
      router.push(getFeatureRoute(nextBlock.linkedFeatureSlug));
    } else {
      // 다음 블록 없음 — "오늘 학습 마감" 흐름. 일일 회고 카드로 부드럽게 스크롤.
      requestAnimationFrame(() => {
        const target = document.getElementById('today-reflection');
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // 회고 ribbon이 collapsed 상태라면 자동 펼침 — aria-expanded=false인 trigger 클릭
        const trigger = target?.querySelector<HTMLButtonElement>('button[aria-expanded="false"]');
        trigger?.click();
      });
    }
  }

  function handleRest() {
    toast(summary(), {
      description: '5분 휴식 후 다음 블록으로 자동 알림',
      duration: 3000,
    });
    onClose();
  }

  function handleClose() {
    toast(summary(), {
      description: '오늘 학습 종료. 내일 플랜이 결과를 반영해 재배치돼요.',
      duration: 3000,
    });
    onClose();
  }

  return (
    <Dialog open={!!block} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <span className="text-pullim-success text-[10px] font-bold tracking-wider uppercase">
            <CheckCircle2 aria-hidden className="mr-1 inline-block h-3 w-3" />
            블록 완료
          </span>
          <DialogTitle className="flex items-start gap-2">
            <span
              className="bg-pullim-slate-100 text-pullim-slate-700 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
              aria-hidden
            >
              <TypeIcon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1 text-left">{block.title}</span>
          </DialogTitle>
          <DialogDescription className="font-mono">
            {block.start}–{block.end} · {block.expectedMinutes}분 · {meta.label}
            {block.subject !== 'rest' && ` · ${subjectLabel}`}
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
        {/* 자동 결과 ─ 정확도 / 소요 시간 */}
        {block.accuracy !== undefined && (
          <section className="bg-pullim-slate-50 grid grid-cols-2 gap-2 rounded-lg p-3">
            <Stat label="정확도" value={`${block.accuracy}점`} tone="accent" />
            <Stat label="소요 시간" value={`${block.expectedMinutes}분`} />
          </section>
        )}

        {/* 감정 체크인 — 선택적 */}
        <section>
          <label className="text-pullim-slate-700 mb-2 block text-[11px] font-bold tracking-wider uppercase">
            오늘 이 블록은 어땠어요? <span className="text-pullim-slate-400 normal-case font-normal">(선택)</span>
          </label>
          <div role="radiogroup" aria-label="감정 체크인" className="flex items-center justify-between gap-1">
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
                    'flex flex-1 flex-col items-center gap-0.5 rounded-lg border px-1 py-2 transition-all',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 focus-visible:ring-offset-1',
                    selected
                      ? 'border-pullim-blue-500 bg-pullim-blue-50 scale-[1.04]'
                      : 'border-pullim-slate-200 hover:border-pullim-slate-300 opacity-70 hover:opacity-100',
                  )}
                >
                  <span aria-hidden className="text-xl leading-none">{emotionEmojis[level]}</span>
                  <span className={cn(
                    'text-[9px] font-semibold',
                    selected ? 'text-pullim-blue-700' : 'text-pullim-slate-500',
                  )}>
                    {level}
                  </span>
                </button>
              );
            })}
          </div>
          {emotion && (
            <p className="text-pullim-slate-500 mt-1.5 text-[10px]">{emotionLabel[emotion]}</p>
          )}
        </section>

        {/* 한 줄 코멘트 — 선택적 */}
        <section>
          <label className="text-pullim-slate-700 mb-1 block text-[11px] font-bold tracking-wider uppercase">
            한 줄 메모 <span className="text-pullim-slate-400 normal-case font-normal">(선택)</span>
          </label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="예: 첫 문제는 헷갈렸지만 마지막은 빠르게"
            maxLength={60}
            className="border-pullim-slate-200 focus-visible:border-pullim-blue-400 w-full rounded-lg border px-3 py-2 text-sm outline-none"
          />
        </section>
        </DialogBody>

        <DialogFooter className="gap-1.5">
          <Button type="button" variant="ghost" onClick={handleClose}>
            종료
          </Button>
          <Button type="button" variant="outline" onClick={handleRest}>
            <Coffee className="mr-1 h-3.5 w-3.5" />
            5분 휴식
          </Button>
          <Button
            type="button"
            onClick={handleNext}
            className="bg-pullim-lemon text-pullim-lemon-ink hover:bg-pullim-lemon/90"
          >
            {nextBlock ? (
              <>
                다음 블록 시작
                <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </>
            ) : (
              <>
                <Clock className="mr-1 h-3.5 w-3.5" />
                오늘 학습 마감
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({
  label, value, tone,
}: { label: string; value: string; tone?: 'accent' }) {
  return (
    <div>
      <div className="text-pullim-slate-500 text-[10px] font-bold tracking-wider uppercase">
        {label}
      </div>
      <div
        className={cn(
          'mt-0.5 font-mono text-base font-bold',
          tone === 'accent' ? 'text-pullim-blue-600' : 'text-pullim-slate-900',
        )}
      >
        {value}
      </div>
    </div>
  );
}

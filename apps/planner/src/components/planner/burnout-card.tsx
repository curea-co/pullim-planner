'use client';

import { useState } from 'react';
import { Heart, TrendingDown, TrendingUp, Minus, Sparkles, MoonStar } from 'lucide-react';
import { toast } from 'sonner';
import {
  todayBurnout, todayBlocks, blockTypeMeta, subjectLabels,
  type BurnoutFactor, type TimeBlock,
} from '@/lib/mock';
import {
  Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const trendIcon = {
  rising:  { Icon: TrendingUp,   color: 'text-pullim-success', label: '회복 중' },
  stable:  { Icon: Minus,        color: 'text-pullim-slate-500', label: '안정' },
  falling: { Icon: TrendingDown, color: 'text-pullim-warn', label: '주의' },
} as const;

const factorStatusColor = {
  good: 'text-pullim-success',
  warn: 'text-pullim-warn',
  bad:  'text-pullim-danger',
} as const;

function formatFactor(f: BurnoutFactor): string {
  return f.unit === '/5' ? `${f.value}/5` : `${f.value}${f.unit}`;
}

/** 이월 대상 — 오늘 미완료(todo/doing) 학습 블록만. 휴식·완료·미수행은 제외 */
function carryoverCandidates(blocks: TimeBlock[]): TimeBlock[] {
  return blocks.filter(b => (b.status === 'todo' || b.status === 'doing') && b.type !== 'break');
}

/**
 * 번아웃 지수 카드 + "오늘은 쉴래요" 버튼.
 * 핸드오프 7.2 (5개 지표 가중 평균) + 4.3 (1-tap 휴식).
 */
export function BurnoutCard() {
  const { score, trend, factors, recommendBreak } = todayBurnout;
  const [open, setOpen] = useState(false);

  const tone = score >= 70 ? 'good' : score >= 50 ? 'warn' : 'bad';
  const ringColor =
    tone === 'good' ? 'var(--color-pullim-success)'
    : tone === 'warn' ? 'var(--color-pullim-warn)'
    : 'var(--color-pullim-danger)';

  const { Icon, color, label } = trendIcon[trend];
  const angle = (score / 100) * 360;

  const carryover = carryoverCandidates(todayBlocks);

  function confirmRest() {
    toast.success('🌙 오늘은 푹 쉬어요', {
      description: `${carryover.length}개 블록을 내일로 이월. 내일 난이도가 −20% 자동 조정돼요.`,
      duration: 3500,
    });
    setOpen(false);
  }

  return (
    <section className="bg-card rounded-xl border p-4">
      <div className="flex items-start gap-4">
        {/* 점수 도넛 — 두께 5px (절반), 배경 ring slate-50로 옅게 */}
        <div
          className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full"
          style={{
            background: `conic-gradient(${ringColor} ${angle}deg, var(--color-pullim-slate-50) 0deg)`,
          }}
        >
          <div className="bg-card flex flex-col items-center justify-center rounded-full" style={{ width: 70, height: 70 }}>
            <span className="text-pullim-slate-900 font-mono text-xl font-bold leading-none">{score}</span>
            <span className="text-pullim-slate-500 text-[10px] tracking-wider">/ 100</span>
          </div>
        </div>

        {/* 라벨 */}
        <div className="flex-1">
          <div className="text-pullim-slate-500 flex items-center gap-1 text-[11px] font-semibold tracking-wider uppercase">
            <Heart className="h-3 w-3" />
            번아웃 안전도
          </div>
          <div className="text-pullim-slate-900 mt-0.5 text-base font-bold">
            {tone === 'good' ? '컨디션 좋아요' : tone === 'warn' ? '컨디션 살펴볼게요' : '오늘은 쉬어가요'}
          </div>
          <div className={cn('mt-1 inline-flex items-center gap-1 text-xs font-semibold', color)}>
            <Icon className="h-3 w-3" />
            {label}
          </div>
        </div>
      </div>

      {/* 5개 지표 */}
      <ul className="mt-4 space-y-1.5">
        {factors.map(f => (
          <li key={f.label} className="flex items-center justify-between text-xs">
            <span className="text-pullim-slate-600">{f.label}</span>
            <span className={cn('font-mono font-bold', factorStatusColor[f.status])}>
              {formatFactor(f)}
            </span>
          </li>
        ))}
      </ul>

      {/* 쉴래요 버튼 */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-3 text-sm font-bold transition-all',
          'bg-pullim-lemon text-pullim-lemon-ink hover:scale-[1.01] hover:shadow-pullim-md active:scale-[0.99]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 focus-visible:ring-offset-2',
        )}
      >
        {recommendBreak ? (
          <>
            오늘은 쉴래요 — AI 추천
            <Sparkles aria-hidden className="h-3.5 w-3.5" />
          </>
        ) : (
          '오늘은 쉴래요'
        )}
      </button>
      <p className="text-pullim-slate-500 mt-1.5 text-center text-[10px]">
        오늘 블록은 내일로 자동 이월돼요
      </p>

      <RestDialog
        open={open}
        onOpenChange={setOpen}
        carryover={carryover}
        onConfirm={confirmRest}
        recommendBreak={recommendBreak}
      />
    </section>
  );
}

function RestDialog({
  open, onOpenChange, carryover, onConfirm, recommendBreak,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carryover: TimeBlock[];
  onConfirm: () => void;
  recommendBreak: boolean;
}) {
  const totalMinutes = carryover.reduce((s, b) => s + b.expectedMinutes, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="bg-pullim-lemon text-pullim-lemon-ink inline-flex h-8 w-8 items-center justify-center rounded-lg">
              <MoonStar aria-hidden className="h-4 w-4" />
            </span>
            오늘은 쉴래요
          </DialogTitle>
          <DialogDescription>
            남은 블록을 내일로 이월하고, 내일 플랜은 컨디션을 반영해 자동 재배치돼요.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
        {recommendBreak && (
          <aside className="bg-pullim-lemon/30 text-pullim-lemon-ink inline-flex w-full items-start gap-1.5 rounded-lg px-3 py-2 text-[11px] leading-relaxed">
            <Sparkles aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              <strong>AI 추천</strong> — 번아웃 지수와 최근 감정 추세를 보면 오늘은 쉬는 편이 더 나아요.
            </span>
          </aside>
        )}

        <section>
          <h4 className="text-pullim-slate-700 mb-2 text-[11px] font-bold tracking-wider uppercase">
            내일로 이월될 블록 {carryover.length}개 · 총 {totalMinutes}분
          </h4>
          {carryover.length === 0 ? (
            <p className="text-pullim-slate-500 text-xs italic">남은 학습 블록이 없어요.</p>
          ) : (
            <ul className="bg-pullim-slate-50 max-h-48 space-y-1 overflow-y-auto rounded-lg p-2">
              {carryover.map(b => {
                const meta = blockTypeMeta[b.type];
                const TypeIcon = meta.Icon;
                return (
                  <li
                    key={b.id}
                    className="bg-card flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px]"
                  >
                    <span className="font-mono text-pullim-slate-500 w-20 shrink-0">{b.start}–{b.end}</span>
                    <TypeIcon aria-hidden className="text-pullim-slate-500 h-3 w-3 shrink-0" />
                    <span className="text-pullim-slate-900 truncate font-semibold">{b.title}</span>
                    <span className="text-pullim-slate-500 ml-auto shrink-0 text-[10px]">
                      {b.subject !== 'rest' && subjectLabels[b.subject]}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <ul className="text-pullim-slate-600 space-y-1 text-[11px]">
          <li>· 내일 블록 난이도가 <strong className="text-pullim-blue-700">−20%</strong> 자동 조정</li>
          <li>· 망각 곡선상 가장 위험한 단원만 우선 재배치</li>
          <li>· 부모·튜터 알림은 기본 비활성 (설정에서 변경)</li>
        </ul>
        </DialogBody>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            className="bg-pullim-lemon text-pullim-lemon-ink hover:bg-pullim-lemon/90"
          >
            확정 — 오늘 쉴래요
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

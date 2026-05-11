'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Heart } from 'lucide-react';
import {
  conditionMeta, todayBurnout,
  type ConditionLevel,
} from '@/lib/mock';
import { cn } from '@/lib/utils';
import { ConditionSlider } from './condition-slider';
import { BurnoutCard } from './burnout-card';

type Props = {
  condition: ConditionLevel;
  onConditionChange: (level: ConditionLevel) => void;
  /** 첫 진입 시 펼친 상태로 시작할지 — 기본 collapsed */
  defaultOpen?: boolean;
};

/**
 * 컨디션 + 번아웃 통합 패널.
 * 기본은 ribbon 한 줄로 *항상 보이되 작게* — "🙂 보통 · 번아웃 64/100"
 * 학생이 자기보고하거나 휴식 결정을 할 때만 펼쳐 카드 두 개 노출.
 *
 * 시그니처(감정 지능)는 ribbon으로 *상시 가시*, 인지 부하는 collapse로 *조절 가능*.
 */
export function ConditionBurnoutPanel({ condition, onConditionChange, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = conditionMeta[condition];
  const score = todayBurnout.score;
  const burnoutTone = score >= 70 ? 'good' : score >= 50 ? 'warn' : 'bad';

  return (
    <section className={cn('bg-card overflow-hidden rounded-xl border', open && 'shadow-pullim-sm')}>
      {/* ribbon — 항상 보임 */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls="condition-burnout-body"
        className={cn(
          'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-pullim-blue-500',
          open ? 'bg-pullim-slate-50/60' : 'hover:bg-pullim-slate-50/40',
        )}
      >
        <span aria-hidden className="text-2xl leading-none">{meta.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="text-pullim-slate-500 text-[10px] font-bold tracking-wider uppercase">
            오늘 컨디션 · 번아웃
          </div>
          <div className="text-pullim-slate-900 mt-0.5 text-sm font-bold">
            {meta.label}
            <span className="text-pullim-slate-400 mx-1.5 font-normal">·</span>
            <span
              className={cn(
                'inline-flex items-center gap-1 font-mono',
                burnoutTone === 'good' ? 'text-pullim-success'
                : burnoutTone === 'warn' ? 'text-pullim-warn'
                : 'text-pullim-danger',
              )}
            >
              <Heart className="h-3 w-3" aria-hidden />
              {score}/100
            </span>
          </div>
        </div>
        <span className="text-pullim-slate-500 inline-flex items-center gap-0.5 text-[11px] font-semibold">
          {open ? '접기' : '펼치기'}
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </span>
      </button>

      {open && (
        <div id="condition-burnout-body" className="space-y-3 border-t p-3">
          <ConditionSlider initial={condition} onChange={onConditionChange} />
          <BurnoutCard />
        </div>
      )}
    </section>
  );
}

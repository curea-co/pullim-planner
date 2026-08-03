'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Battery } from 'lucide-react';
import {
  conditionMeta,
  type BurnoutSnapshot, type ConditionLevel,
} from '@/lib/mock';
import { cn } from '@/lib/utils';
import { ConditionSlider } from './condition-slider';
import { BurnoutCard } from './burnout-card';

type Props = {
  condition: ConditionLevel;
  /** 번아웃 스냅샷 — 실모드는 이번 주 완료 기록 기반 계산값, null=집계 데이터 없음. */
  burnout: BurnoutSnapshot | null;
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
export function ConditionBurnoutPanel({ condition, burnout, onConditionChange, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);
  const meta = conditionMeta[condition];
  // 안전도 시맨틱 — 높을수록 안전. 데이터 없으면(null) 칩 미노출.
  const score = burnout?.score ?? null;
  const burnoutTone = score === null ? null : score >= 70 ? 'good' : score >= 50 ? 'warn' : 'bad';
  const burnoutLabel = burnoutTone === 'good' ? '안전' : burnoutTone === 'warn' ? '주의' : '위험';

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
        <div className="min-w-0 flex-1">
          <div className="text-pullim-slate-500 text-[10px] font-bold tracking-wider uppercase">
            오늘 상태
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {/* 컨디션 칩 — 주관 감정. 상태 문구는 미노출(QA #13), 이모지만 */}
            <span className="bg-pullim-slate-100 text-pullim-slate-900 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold">
              <span aria-hidden>{meta.emoji}</span>
              <span className="sr-only">{meta.label}</span>
              오늘
            </span>
            {/* 안전도 칩 — 객관 누적 부담 (높을수록 안전). 완료 기록 없으면 '–' (판정 보류, 사용자 확정 08-03) */}
            <span
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-xs font-bold',
                score === null ? 'bg-pullim-slate-100 text-pullim-slate-400'
                : burnoutTone === 'good' ? 'bg-pullim-success-bg text-pullim-success'
                : burnoutTone === 'warn' ? 'bg-pullim-warn-bg text-pullim-warn-cta-bg'
                : 'bg-pullim-danger-bg text-pullim-danger',
              )}
              title={score === null ? '번아웃 안전도 — 블록을 완료하면 계산돼요' : '번아웃 안전도 — 높을수록 안전'}
            >
              <Battery className="h-3 w-3" aria-hidden />
              {score === null ? '안전도 –' : `안전도 ${score} · ${burnoutLabel}`}
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
          <BurnoutCard burnout={burnout} />
        </div>
      )}
    </section>
  );
}

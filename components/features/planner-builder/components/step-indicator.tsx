'use client';

import { Check, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type Step = {
  num: number;
  label: string;
  icon: LucideIcon;
};

type Props = {
  steps: Step[];
  current: number;
  /** 지금 갈 수 있는 가장 뒤 단계 — 그 뒤는 누를 수 없다. 미지정이면 전부 허용. */
  maxReachable?: number;
  onJump: (n: number) => void;
};

/** Tailwind 는 클래스명을 정적으로 훑으므로 조합해 만들지 않고 사전으로 둔다. */
const GRID_COLS: Record<number, string> = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-3',
  4: 'sm:grid-cols-4',
  5: 'sm:grid-cols-5',
  6: 'sm:grid-cols-6',
  7: 'sm:grid-cols-7',
  8: 'sm:grid-cols-8',
  9: 'sm:grid-cols-9',
};

/**
 * 단계 진행 표시 — 한 줄(번호 + 라벨 가로 배치). 완료 단계는 체크, 현재 단계는 강조,
 * 아직 못 가는 단계는 흐림 + 비활성.
 *
 * 번호와 라벨을 세로로 쌓으면 칸이 80px 가까이 높아지는데 그 안의 실제 내용은 28px 뿐이라
 * 셀마다 빈 띠가 남는다 — 가로로 눕혀 칸 폭을 쓰고 높이를 절반으로 줄인다.
 */
export function StepIndicator({ steps, current, maxReachable, onJump }: Props) {
  const limit = maxReachable ?? steps.length;
  return (
    <nav aria-label="시간표 만들기 진행" className="bg-card overflow-x-auto rounded-2xl border sm:overflow-hidden">
      <ol className={cn(
        'flex min-w-max sm:grid sm:min-w-0 divide-pullim-slate-100 divide-x',
        GRID_COLS[steps.length] ?? 'sm:grid-cols-4',
      )}>
        {steps.map(s => {
          const isActive = s.num === current;
          const isDone = s.num < current;
          const locked = s.num > limit;
          const Icon = s.icon;
          return (
            <li key={s.num} className="min-w-[84px] sm:min-w-0">
              <button
                type="button"
                onClick={() => onJump(s.num)}
                disabled={locked}
                className={cn(
                  'group flex w-full items-center justify-center gap-1.5 px-2 py-2.5 text-center transition-colors',
                  isActive && 'bg-pullim-blue-50',
                  !isActive && !locked && 'hover:bg-pullim-slate-50',
                  // 흐림은 JS 조건이 아니라 disabled: 접두사로 — 이 <button>은 locked 일 때
                  // 네이티브 disabled 속성을 받는다(위 disabled={locked}). 계약 §4.1.
                  'disabled:cursor-not-allowed disabled:opacity-50',
                )}
              >
                <span
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[length:var(--text-2xs)] font-bold transition-colors',
                    isDone && 'bg-pullim-success text-white',
                    isActive && 'bg-pullim-blue-600 text-white',
                    !isDone && !isActive && 'bg-pullim-slate-100 text-pullim-slate-500',
                  )}
                >
                  {isDone ? <Check className="h-3 w-3" /> : s.num}
                </span>
                <span
                  className={cn(
                    'flex items-center gap-0.5 text-[length:var(--text-xs)] font-bold leading-tight',
                    isActive ? 'text-pullim-blue-700' : isDone ? 'text-pullim-slate-700' : 'text-pullim-slate-400',
                  )}
                >
                  <Icon className="h-2.5 w-2.5" />
                  {s.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

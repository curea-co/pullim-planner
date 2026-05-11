'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { conditionMeta, type ConditionLevel } from '@/lib/mock';
import { cn } from '@/lib/utils';

type Props = {
  initial?: ConditionLevel;
  /** 학생이 컨디션을 변경하면 호출 — day-view가 받아 시계 톤·블록 라벨에 전파 */
  onChange?: (level: ConditionLevel) => void;
};

const levels: ConditionLevel[] = [1, 2, 3, 4, 5];

/**
 * 컨디션 슬라이더 — 매일 아침 자기보고 (핸드오프 7.3).
 * 선택값에 따라 오늘 블록 난이도 ±20% (UI에 표시).
 *
 * a11y — radiogroup 패턴. 좌/우 화살표로 단계 이동, Home/End로 양 끝.
 */
export function ConditionSlider({ initial = 3, onChange }: Props) {
  const [value, setValue] = useState<ConditionLevel>(initial);
  const meta = conditionMeta[value];
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  // 외부 onChange 통지 — 초기값에는 호출하지 않음
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    onChange?.(value);
  }, [value, onChange]);

  function move(next: ConditionLevel) {
    setValue(next);
    // 키보드 이동 시 포커스도 따라가야 radiogroup roving tabindex 일관성 유지
    requestAnimationFrame(() => {
      buttonsRef.current[next - 1]?.focus();
    });
  }

  function handleKey(e: KeyboardEvent<HTMLDivElement>) {
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault();
        move(Math.min(5, value + 1) as ConditionLevel);
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        move(Math.max(1, value - 1) as ConditionLevel);
        break;
      case 'Home':
        e.preventDefault();
        move(1);
        break;
      case 'End':
        e.preventDefault();
        move(5);
        break;
    }
  }

  return (
    <section className="bg-card rounded-xl border p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-pullim-slate-900 text-sm font-bold">오늘의 컨디션</h3>
        <span className="text-pullim-slate-400 text-[10px]">매일 아침 보고</span>
      </div>

      <div
        role="radiogroup"
        aria-label="오늘의 컨디션 (1=피곤, 5=쌩쌩)"
        onKeyDown={handleKey}
        className="bg-pullim-slate-50 mb-2 flex h-14 items-center justify-around rounded-xl px-2"
      >
        {levels.map((l, i) => {
          const m = conditionMeta[l];
          const active = l === value;
          return (
            <button
              key={l}
              ref={el => { buttonsRef.current[i] = el; }}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${m.label} (${m.difficultyAdj})`}
              tabIndex={active ? 0 : -1}
              onClick={() => setValue(l)}
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full text-2xl transition-all',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 focus-visible:ring-offset-2',
                active
                  ? 'bg-white shadow-pullim-md scale-110'
                  : 'opacity-60 hover:opacity-90',
              )}
            >
              <span aria-hidden>{m.emoji}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-baseline justify-between text-xs">
        <span className="text-pullim-slate-700 font-semibold">{meta.label}</span>
        <span className="text-pullim-blue-600 font-mono font-bold">{meta.difficultyAdj}</span>
      </div>
    </section>
  );
}

'use client';

import { useRef, useState, type KeyboardEvent } from 'react';
import { conditionMeta, type ConditionLevel } from '@/lib/mock';
import { cn } from '@/lib/utils';

type Props = {
  /**
   * 제어형 값 — `null`=오늘 미기록('선택 전' 표시, 자동 저장 금지). 미지정(undefined)이면
   * 비제어(내부 상태 + initial) — 온보딩 데모 등 기존 소비처 유지.
   */
  value?: ConditionLevel | null;
  initial?: ConditionLevel;
  /** 학생이 컨디션을 변경하면 호출 — day-view가 받아 시계 톤·블록 라벨에 전파 */
  onChange?: (level: ConditionLevel) => void;
};

const levels: ConditionLevel[] = [1, 2, 3, 4, 5];

/**
 * 컨디션 슬라이더 — 매일 아침 자기보고 (핸드오프 7.3).
 *
 * QA #13 — 상태 문구('피곤해요' 등)·난이도 ±N%·'매일 아침 보고' 라벨은 화면에 노출하지 않는다.
 * [기획의도] 사용자가 본인 선택의 결과(난이도 조절)를 노골적으로 확인하지 못하게 — 숫자가 아닌
 * 상태 그대로를 입력받아 간접적으로 난이도를 조절한다. (a11y용 aria-label에만 상태명 유지)
 *
 * a11y — radiogroup 패턴. 좌/우 화살표로 단계 이동, Home/End로 양 끝.
 */
export function ConditionSlider({ value: valueProp, initial = 3, onChange }: Props) {
  const [inner, setInner] = useState<ConditionLevel>(initial);
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  // 제어형(value 지정) 우선 — 비제어는 내부 상태. onChange 는 사용자 조작 시에만 직접 호출
  // (초기값·서버 복원 값에는 호출하지 않음 — 자동 저장 금지).
  const controlled = valueProp !== undefined;
  const value: ConditionLevel | null = controlled ? valueProp : inner;

  function select(next: ConditionLevel) {
    if (!controlled) setInner(next);
    onChange?.(next);
  }

  function move(next: ConditionLevel) {
    select(next);
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
        // '선택 전'(null)은 포커스 기준(중앙 3)에서 증감 — roving tabindex 정합(Codex)
        move(value === null ? 4 : (Math.min(5, value + 1) as ConditionLevel));
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault();
        move(value === null ? 2 : (Math.max(1, value - 1) as ConditionLevel));
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
      <div className="mb-3">
        <h3 className="text-pullim-slate-900 text-sm font-bold">오늘의 컨디션</h3>
      </div>

      <div
        role="radiogroup"
        aria-label="오늘의 컨디션 (1=피곤, 5=쌩쌩)"
        onKeyDown={handleKey}
        className="bg-pullim-slate-50 flex h-14 items-center justify-around rounded-xl px-2"
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
              aria-label={m.label}
              tabIndex={active || (value === null && l === 3) ? 0 : -1}
              onClick={() => select(l)}
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
      {value === null && (
        <p className="text-pullim-slate-500 mt-2 text-[11px]">
          오늘 컨디션을 골라주세요 — 선택하면 저장돼요.
        </p>
      )}
    </section>
  );
}

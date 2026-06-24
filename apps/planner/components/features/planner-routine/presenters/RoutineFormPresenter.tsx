'use client';

import { ArrowLeft, Trash2 } from 'lucide-react';
import {
  blockTypeMeta, subjectLabels, WEEKDAY_LABELS, WEEKDAY_ORDER,
  type SubjectKey, type BlockType, type Weekday,
} from '@/lib/mock';
import { cn } from '@/lib/utils';

/** 루틴 폼 상태 (id 제외). */
export type RoutineFormState = {
  title: string;
  subject: SubjectKey;
  type: BlockType;
  startTime: string;
  endTime: string;
  weekdays: Weekday[];
};

/** 루틴 유형 — 학습 블록 7종(휴식 제외). */
const ROUTINE_TYPES: BlockType[] = [
  'concept', 'practice', 'review', 'memorize', 'mock', 'tutor', 'self_explain',
];
const SUBJECTS = Object.keys(subjectLabels) as SubjectKey[];

interface RoutineFormPresenterProps {
  mode: 'create' | 'edit';
  form: RoutineFormState;
  onChange: <K extends keyof RoutineFormState>(key: K, value: RoutineFormState[K]) => void;
  onToggleWeekday: (d: Weekday) => void;
  canSave: boolean;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
}

export default function RoutineFormPresenter({
  mode, form, onChange, onToggleWeekday, canSave, onSave, onCancel, onDelete,
}: RoutineFormPresenterProps) {
  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={onCancel}
        className="text-pullim-slate-500 hover:text-pullim-slate-900 -ml-1 inline-flex items-center gap-1 rounded-md px-1 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        내 루틴
      </button>

      <section className="bg-card space-y-5 rounded-2xl border p-5">
        <h1 className="text-pullim-slate-900 text-lg font-bold">
          {mode === 'create' ? '새 루틴' : '루틴 편집'}
        </h1>

        {/* 제목 */}
        <div className="space-y-1.5">
          <label htmlFor="routine-title" className="text-pullim-slate-700 text-xs font-bold">
            반복 행동 이름
          </label>
          <input
            id="routine-title"
            type="text"
            value={form.title}
            maxLength={40}
            placeholder="예: 아침 영단어"
            onChange={(e) => onChange('title', e.target.value)}
            className="border-border focus-visible:ring-pullim-blue-500 w-full rounded-lg border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
          />
        </div>

        {/* 과목 */}
        <div className="space-y-1.5">
          <label htmlFor="routine-subject" className="text-pullim-slate-700 text-xs font-bold">과목</label>
          <select
            id="routine-subject"
            value={form.subject}
            onChange={(e) => onChange('subject', e.target.value as SubjectKey)}
            className="border-border focus-visible:ring-pullim-blue-500 w-full rounded-lg border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2"
          >
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>{subjectLabels[s]}</option>
            ))}
          </select>
        </div>

        {/* 유형 */}
        <div className="space-y-1.5">
          <span className="text-pullim-slate-700 text-xs font-bold">유형</span>
          <div className="flex flex-wrap gap-1.5">
            {ROUTINE_TYPES.map((t) => {
              const selected = form.type === t;
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange('type', t)}
                  className={cn(
                    'rounded-lg px-2.5 py-1.5 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500',
                    selected
                      ? 'bg-pullim-blue-600 text-white'
                      : 'bg-pullim-slate-100 text-pullim-slate-600 hover:bg-pullim-slate-200',
                  )}
                >
                  {blockTypeMeta[t].label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 시간대 */}
        <div className="space-y-1.5">
          <span className="text-pullim-slate-700 text-xs font-bold">시간대</span>
          <div className="flex items-center gap-2">
            <input
              type="time"
              value={form.startTime}
              step={900}
              onChange={(e) => onChange('startTime', e.target.value)}
              aria-label="시작 시각"
              className="border-border focus-visible:ring-pullim-blue-500 rounded-lg border px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2"
            />
            <span className="text-pullim-slate-400">–</span>
            <input
              type="time"
              value={form.endTime}
              step={900}
              onChange={(e) => onChange('endTime', e.target.value)}
              aria-label="종료 시각"
              className="border-border focus-visible:ring-pullim-blue-500 rounded-lg border px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-2"
            />
          </div>
        </div>

        {/* 반복 요일 */}
        <div className="space-y-1.5">
          <span className="text-pullim-slate-700 text-xs font-bold">반복 요일</span>
          <div className="flex flex-wrap gap-1.5">
            {WEEKDAY_ORDER.map((d) => {
              const selected = form.weekdays.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onToggleWeekday(d)}
                  className={cn(
                    'h-9 w-9 rounded-lg text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500',
                    selected
                      ? 'bg-pullim-blue-600 text-white'
                      : 'bg-pullim-slate-100 text-pullim-slate-600 hover:bg-pullim-slate-200',
                  )}
                >
                  {WEEKDAY_LABELS[d]}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between">
        {mode === 'edit' && onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            className="text-pullim-danger hover:bg-pullim-danger-bg inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-danger"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            삭제
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className="bg-pullim-blue-600 hover:bg-pullim-blue-700 disabled:bg-pullim-slate-200 disabled:text-pullim-slate-400 inline-flex items-center rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-pullim-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-300 disabled:cursor-not-allowed"
        >
          루틴 저장하기
        </button>
      </div>
    </div>
  );
}

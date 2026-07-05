'use client';

import { Pencil, Trash2, Clock } from 'lucide-react';
import { blockTypeMeta, routineSubjectLabel, formatWeekdays, type Routine } from '@/lib/mock';
import { BLOCK_TYPE_STRIPE } from '@/lib/planner/block-type-style';
import { cn } from '@/lib/utils';

interface RoutineCardProps {
  routine: Routine;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

/** 루틴 라이브러리 카드 — 좌측 타입색 stripe + 제목·과목/유형·시간·반복요일 + 편집/삭제. */
export function RoutineCard({ routine, onEdit, onDelete }: RoutineCardProps) {
  const TypeIcon = blockTypeMeta[routine.type].Icon;

  return (
    <div className="border-border bg-card shadow-pullim-sm relative flex items-center gap-3 overflow-hidden rounded-2xl border p-3 pl-4">
      <span
        className={cn('absolute inset-y-0 left-0 w-1', BLOCK_TYPE_STRIPE[routine.type])}
        aria-hidden
      />
      <span
        className="bg-pullim-blue-50 text-pullim-blue-700 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
        aria-hidden
      >
        <TypeIcon className="h-5 w-5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="text-pullim-slate-900 truncate text-sm font-bold">{routine.title}</div>
        <div className="text-pullim-slate-500 mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs">
          <span>{routineSubjectLabel(routine.subject)}</span>
          <span className="text-pullim-slate-300">·</span>
          <span>{blockTypeMeta[routine.type].label}</span>
          <span className="text-pullim-slate-300">·</span>
          <span className="inline-flex items-center gap-0.5">
            <Clock className="h-3 w-3" aria-hidden />
            <span className="font-mono">{routine.startTime}–{routine.endTime}</span>
          </span>
        </div>
        <div className="mt-1">
          <span className="bg-pullim-slate-100 text-pullim-slate-600 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold">
            {formatWeekdays(routine.weekdays)}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onEdit(routine.id)}
          aria-label={`${routine.title} 편집`}
          className="text-pullim-slate-500 hover:bg-pullim-slate-100 hover:text-pullim-slate-700 inline-flex h-9 w-9 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
        >
          <Pencil className="h-4 w-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => onDelete(routine.id)}
          aria-label={`${routine.title} 삭제`}
          className="text-pullim-slate-500 hover:bg-pullim-danger-bg hover:text-pullim-danger inline-flex h-9 w-9 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-danger"
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

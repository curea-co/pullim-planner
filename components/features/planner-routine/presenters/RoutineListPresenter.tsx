'use client';

import { Plus, Repeat2, AlertCircle } from 'lucide-react';
import { WEEKDAY_LABELS, WEEKDAY_ORDER, type Routine } from '@/lib/mock';
import { PageHeader } from '@/components/shell/page-header';
import { RoutineCard } from '../components/routine-card';

interface RoutineListPresenterProps {
  routines: Routine[];
  loading?: boolean;
  loadError?: boolean;
  onAdd: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function RoutineListPresenter({
  routines, loading = false, loadError = false, onAdd, onEdit, onDelete,
}: RoutineListPresenterProps) {
  // 요일별 걸린 루틴 수 — 요약 띠 도트
  const counts = WEEKDAY_ORDER.map(
    (d) => routines.filter((r) => r.weekdays.includes(d)).length,
  );

  const addButton = (
    <button
      type="button"
      onClick={onAdd}
      className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex items-center gap-1 rounded-xl px-3.5 py-2 text-sm font-bold text-white shadow-pullim-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-300"
    >
      <Plus className="h-4 w-4" aria-hidden />
      루틴 추가
    </button>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="루틴"
        description="반복하는 행동을 등록해 두세요. 새 시간표 만들기에 곧 연결돼요."
        action={addButton}
      />

      {loading ? (
        <div className="border-pullim-slate-200 bg-pullim-slate-50/50 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-16 text-center">
          <Repeat2 className="text-pullim-slate-300 h-8 w-8 animate-pulse" aria-hidden />
          <p className="text-pullim-slate-500 text-sm">루틴을 불러오는 중…</p>
        </div>
      ) : loadError ? (
        <div className="border-pullim-danger/30 bg-pullim-danger-bg/40 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-16 text-center">
          <AlertCircle className="text-pullim-danger h-8 w-8" aria-hidden />
          <p className="text-pullim-slate-700 text-sm font-bold">루틴을 불러오지 못했어요</p>
          <p className="text-pullim-slate-500 text-xs">잠시 후 다시 시도해 주세요.</p>
        </div>
      ) : routines.length === 0 ? (
        <div className="border-pullim-slate-200 bg-pullim-slate-50/50 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-6 py-16 text-center">
          <Repeat2 className="text-pullim-slate-400 h-8 w-8" aria-hidden />
          <p className="text-pullim-slate-700 text-sm font-bold">아직 루틴이 없어요</p>
          <p className="text-pullim-slate-500 text-xs">
            매일 반복하는 행동을 등록해 두세요. 새 시간표 만들기에 곧 연결돼요.
          </p>
          <div className="mt-2">{addButton}</div>
        </div>
      ) : (
        <>
          {/* 요일 요약 띠 */}
          <div className="bg-card flex items-center gap-1 rounded-xl border p-2">
            {WEEKDAY_ORDER.map((d) => (
              <div key={d} className="flex flex-1 flex-col items-center gap-1 py-1">
                <span className="text-pullim-slate-500 text-[length:var(--text-xs)] font-bold">{WEEKDAY_LABELS[d]}</span>
                <span
                  className={
                    counts[d] > 0
                      ? 'bg-pullim-blue-600 text-white inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[length:var(--text-2xs)] font-bold'
                      : 'bg-pullim-slate-100 text-pullim-slate-400 inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[length:var(--text-2xs)] font-bold'
                  }
                  aria-label={`${WEEKDAY_LABELS[d]}요일 루틴 ${counts[d]}개`}
                >
                  {counts[d]}
                </span>
              </div>
            ))}
          </div>

          <ul className="space-y-2">
            {routines.map((r) => (
              <li key={r.id}>
                <RoutineCard routine={r} onEdit={onEdit} onDelete={onDelete} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

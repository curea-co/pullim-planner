'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  findRoutine, addRoutine, updateRoutine, removeRoutine, minutesBetween,
  type Weekday,
} from '@/lib/mock';
import RoutineFormPresenter, { type RoutineFormState } from '../presenters/RoutineFormPresenter';

const DEFAULT_FORM: RoutineFormState = {
  title: '', subject: 'math', type: 'concept',
  startTime: '19:00', endTime: '19:50', weekdays: [0, 1, 2, 3, 4],
};

interface RoutineFormContainerProps {
  /** 있으면 편집 모드, 없으면 생성 */
  routineId?: string;
}

export default function RoutineFormContainer({ routineId }: RoutineFormContainerProps) {
  const router = useRouter();
  const existing = routineId ? findRoutine(routineId) : undefined;
  const mode: 'create' | 'edit' = routineId ? 'edit' : 'create';

  const [form, setForm] = useState<RoutineFormState>(() =>
    existing
      ? {
          title: existing.title, subject: existing.subject, type: existing.type,
          startTime: existing.startTime, endTime: existing.endTime,
          weekdays: [...existing.weekdays],
        }
      : DEFAULT_FORM,
  );

  const onChange = useCallback(
    <K extends keyof RoutineFormState>(key: K, value: RoutineFormState[K]) => {
      setForm((f) => ({ ...f, [key]: value }));
    },
    [],
  );

  const onToggleWeekday = useCallback((d: Weekday) => {
    setForm((f) => {
      const has = f.weekdays.includes(d);
      const weekdays = (has ? f.weekdays.filter((x) => x !== d) : [...f.weekdays, d])
        .sort((a, b) => a - b);
      return { ...f, weekdays };
    });
  }, []);

  const canSave =
    form.title.trim().length > 0 &&
    form.weekdays.length > 0 &&
    minutesBetween(form.startTime, form.endTime) > 0;

  const onCancel = useCallback(() => router.push('/planner/routine'), [router]);

  const onSave = useCallback(() => {
    if (!canSave) return;
    const payload = {
      title: form.title.trim(), subject: form.subject, type: form.type,
      startTime: form.startTime, endTime: form.endTime, weekdays: form.weekdays,
    };
    if (mode === 'edit' && routineId) {
      updateRoutine(routineId, payload);
      toast.success('루틴을 저장했어요');
    } else {
      addRoutine(payload);
      toast.success('루틴을 저장했어요', {
        description: '새 시간표 만들 때 골라 쓸 수 있어요',
      });
    }
    router.push('/planner/routine');
  }, [canSave, form, mode, routineId, router]);

  const onDelete = useCallback(() => {
    if (!routineId) return;
    removeRoutine(routineId);
    toast('🗑 루틴 삭제됨');
    router.push('/planner/routine');
  }, [routineId, router]);

  // 편집 진입했는데 대상이 없으면(삭제됨/잘못된 id) 안내
  if (mode === 'edit' && !existing) {
    return (
      <div className="text-pullim-slate-500 py-20 text-center text-sm">
        루틴을 찾을 수 없어요.{' '}
        <button
          type="button"
          onClick={onCancel}
          className="text-pullim-blue-600 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
        >
          내 루틴으로
        </button>
      </div>
    );
  }

  return (
    <RoutineFormPresenter
      mode={mode}
      form={form}
      onChange={onChange}
      onToggleWeekday={onToggleWeekday}
      canSave={canSave}
      onSave={onSave}
      onCancel={onCancel}
      onDelete={mode === 'edit' ? onDelete : undefined}
    />
  );
}

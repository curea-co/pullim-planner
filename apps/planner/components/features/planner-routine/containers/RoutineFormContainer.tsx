'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ApiError } from '@pullim-planner/api-client';
import {
  findRoutine, addRoutine, updateRoutine, removeRoutine, minutesBetween,
  type Routine, type Weekday,
} from '@/lib/mock';
import {
  pullimPlannerClient, pullimToRoutine, toRoutineWrite, toRoutinePatch,
} from '@/lib/planner/pullim-client';
import RoutineFormPresenter, { type RoutineFormState } from '../presenters/RoutineFormPresenter';

const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1';

const DEFAULT_FORM: RoutineFormState = {
  title: '', subject: 'math', type: 'concept',
  startTime: '19:00', endTime: '19:50', weekdays: [0, 1, 2, 3, 4],
};

function toFormState(r: Routine): RoutineFormState {
  return {
    title: r.title, subject: r.subject, type: r.type,
    startTime: r.startTime, endTime: r.endTime,
    weekdays: [...r.weekdays],
  };
}

interface RoutineFormContainerProps {
  /** 있으면 편집 모드, 없으면 생성 */
  routineId?: string;
}

export default function RoutineFormContainer({ routineId }: RoutineFormContainerProps) {
  const router = useRouter();
  const mode: 'create' | 'edit' = routineId ? 'edit' : 'create';

  const [form, setForm] = useState<RoutineFormState>(DEFAULT_FORM);
  // 편집 모드: 목록 fetch 후 대상 routine 을 찾는다. create 면 로딩 불필요.
  const [loading, setLoading] = useState(mode === 'edit');
  const [notFound, setNotFound] = useState(false);
  // 로드 실패(일시 장애)와 not-found(대상 없음)를 분리 — 네트워크·401·500 을 "삭제됨"으로 오인하지 않게.
  const [loadError, setLoadError] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  const [saving, setSaving] = useState(false);

  // 편집 진입 — 목록을 fetch 해 대상 routine 을 찾고 폼에 채운다(없으면 안내).
  useEffect(() => {
    if (mode !== 'edit' || !routineId) return;
    let cancelled = false;
    // 재fetch 시작 시 상태 초기화 — 같은 인스턴스가 다른 routineId 로 재사용될 때 이전 notFound/loadError 잔존 방지.
    setLoading(true);
    setNotFound(false);
    setLoadError(false);
    void (async () => {
      if (DEV_AUTH_BYPASS) {
        const found = findRoutine(routineId);
        if (!cancelled) {
          if (found) setForm(toFormState(found));
          else setNotFound(true);
          setLoading(false);
        }
        return;
      }
      try {
        const list = await pullimPlannerClient.routines();
        const found = list.map(pullimToRoutine).find((r) => r.id === routineId);
        if (!cancelled) {
          if (found) setForm(toFormState(found));
          else setNotFound(true);
        }
      } catch (e) {
        if (!cancelled) {
          // 일시 장애(네트워크·401·500)는 "삭제됨(notFound)" 이 아니라 재시도 가능한 로드 실패로 구분.
          setLoadError(true);
          toast.error(
            e instanceof ApiError ? e.message : '루틴을 불러오지 못했어요',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mode, routineId, reloadTick]);

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
    !saving &&
    form.title.trim().length > 0 &&
    form.weekdays.length > 0 &&
    minutesBetween(form.startTime, form.endTime) > 0;

  const onCancel = useCallback(() => router.push('/planner/routine'), [router]);

  const onSave = useCallback(() => {
    if (saving) return;
    if (
      form.title.trim().length === 0 ||
      form.weekdays.length === 0 ||
      minutesBetween(form.startTime, form.endTime) <= 0
    ) {
      return;
    }
    const formValue: Omit<Routine, 'id'> = {
      title: form.title.trim(), subject: form.subject, type: form.type,
      startTime: form.startTime, endTime: form.endTime, weekdays: form.weekdays,
    };

    // dev 우회 — 공유 mock store. 화면/위저드가 같은 store 를 읽어 일관.
    if (DEV_AUTH_BYPASS) {
      if (mode === 'edit' && routineId) {
        updateRoutine(routineId, formValue);
        toast.success('루틴을 저장했어요');
      } else {
        addRoutine(formValue);
        toast.success('루틴을 저장했어요', {
          description: '새 시간표 만들기에 곧 연결돼요',
        });
      }
      router.push('/planner/routine');
      return;
    }

    setSaving(true);
    void (async () => {
      try {
        if (mode === 'edit' && routineId) {
          await pullimPlannerClient.updateRoutine(routineId, toRoutinePatch(formValue));
          toast.success('루틴을 저장했어요');
        } else {
          await pullimPlannerClient.createRoutine(toRoutineWrite(formValue));
          toast.success('루틴을 저장했어요', {
            description: '새 시간표 만들기에 곧 연결돼요',
          });
        }
        router.push('/planner/routine');
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : '루틴 저장 실패');
        setSaving(false);
      }
    })();
  }, [saving, form, mode, routineId, router]);

  const onDelete = useCallback(() => {
    if (!routineId || saving) return;
    if (DEV_AUTH_BYPASS) {
      removeRoutine(routineId);
      toast('🗑 루틴 삭제됨');
      router.push('/planner/routine');
      return;
    }
    setSaving(true);
    void (async () => {
      try {
        await pullimPlannerClient.deleteRoutine(routineId);
        toast('🗑 루틴 삭제됨');
        router.push('/planner/routine');
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : '루틴 삭제 실패');
        setSaving(false);
      }
    })();
  }, [routineId, saving, router]);

  // 편집 로딩 중 — 폼이 채워지기 전 간단한 안내.
  if (mode === 'edit' && loading) {
    return (
      <div className="text-pullim-slate-500 py-20 text-center text-sm">
        루틴을 불러오는 중…
      </div>
    );
  }

  // 편집 로드가 일시 장애로 실패 — "삭제됨(notFound)"과 구분해 재시도 제공(존재하는 루틴을 못 여는 상황 방지).
  if (mode === 'edit' && loadError) {
    return (
      <div className="text-pullim-slate-500 py-20 text-center text-sm">
        루틴을 불러오지 못했어요.{' '}
        <button
          type="button"
          onClick={() => setReloadTick((t) => t + 1)}
          className="text-pullim-blue-600 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
        >
          다시 시도
        </button>
      </div>
    );
  }

  // 편집 진입했는데 대상이 없으면(삭제됨/잘못된 id) 안내
  if (mode === 'edit' && notFound) {
    return (
      <div className="text-pullim-slate-500 py-20 text-center text-sm">
        루틴을 찾을 수 없어요.{' '}
        <button
          type="button"
          onClick={onCancel}
          className="text-pullim-blue-600 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
        >
          루틴으로
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

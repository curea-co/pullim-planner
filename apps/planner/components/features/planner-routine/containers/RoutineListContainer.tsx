'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ApiError } from '@pullim-planner/api-client';
import {
  getRoutines, removeRoutine, restoreRoutine, findRoutine, type Routine,
} from '@/lib/mock';
import { pullimPlannerClient, pullimToRoutine } from '@/lib/planner/pullim-client';
import RoutineListPresenter from '../presenters/RoutineListPresenter';

const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1';

/**
 * 루틴 라이브러리 Container — pullim-api routines 기반 CRUD 진입.
 *
 * 마운트 + tick(mutation 후 refresh) 마다 본인 루틴 목록을 다시 읽는다. ManagePlannersContainer 와
 * 같은 패턴: DEV_AUTH_BYPASS(로컬·쿠키 미지원) 면 공유 mock store, 아니면 실 API.
 * loading/loadError 를 분리해 "정말 비어 있음"과 "불러오기 실패"를 구분한다.
 */
export default function RoutineListContainer() {
  const router = useRouter();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (DEV_AUTH_BYPASS) {
        if (!cancelled) {
          setRoutines([...getRoutines()]);
          setLoadError(false);
          setLoading(false);
        }
        return;
      }
      try {
        const list = await pullimPlannerClient.routines();
        if (!cancelled) {
          setRoutines(list.map(pullimToRoutine));
          setLoadError(false);
        }
      } catch (e) {
        if (!cancelled) {
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
  }, [tick]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const onAdd = useCallback(() => router.push('/planner/routine/new'), [router]);
  const onEdit = useCallback((id: string) => router.push(`/planner/routine/${id}`), [router]);

  const onDelete = useCallback((id: string) => {
    // dev 우회 — 공유 mock store 에서 삭제 + 되돌리기 UX 유지 (엔티티 동일성 보존).
    if (DEV_AUTH_BYPASS) {
      const removed = removeRoutine(id);
      if (!removed) return;
      refresh();
      toast(`🗑 ${removed.routine.title} 삭제됨`, {
        duration: 4000,
        action: {
          label: '되돌리기',
          onClick: () => {
            restoreRoutine(removed.routine, removed.index);
            refresh();
          },
        },
      });
      return;
    }
    // 실 API — BE 에 restore 엔드포인트가 없어 되돌리기 없이 단순 삭제 + 토스트.
    const target = routines.find((r) => r.id === id) ?? findRoutine(id);
    void (async () => {
      try {
        await pullimPlannerClient.deleteRoutine(id);
        toast(`🗑 ${target?.title ?? '루틴'} 삭제됨`);
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : '루틴 삭제 실패');
      } finally {
        refresh();
      }
    })();
  }, [refresh, routines]);

  return (
    <RoutineListPresenter
      routines={routines}
      loading={loading}
      loadError={loadError}
      onAdd={onAdd}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}

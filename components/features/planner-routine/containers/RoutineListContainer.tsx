'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import {
  getRoutines, removeRoutine, restoreRoutine, findRoutine, type Routine,
} from '@/lib/mock';
import { pullimPlannerClient, pullimToRoutine } from '@/lib/planner/pullim-client';
import RoutineListPresenter from '../presenters/RoutineListPresenter';
import { RoutineDeleteConfirmDialog } from '../components/routine-delete-confirm-dialog';

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
  // new/edit 페이지에서 저장 후 목록으로 복귀 시 재fetch — App Router 인스턴스 재사용 방어.
  // pathname 이 /planner/routine 로 재진입할 때마다 effect 를 다시 태워 stale 목록을 갱신한다.
  const pathname = usePathname();
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tick, setTick] = useState(0);
  // 삭제 confirm 다이얼로그 타깃 — null 이면 닫힘. 즉시 영구 삭제 대신 확인을 거친다(ManagePlannersContainer 미러).
  const [deleteTarget, setDeleteTarget] = useState<Routine | null>(null);
  // 실 API 삭제 in-flight id 집합 — 같은 카드 연속 탭 시 deleteRoutine 중복 호출(성공→404 실패 토스트) 방어.
  const [deletingIds, setDeletingIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // 재조회 시작 시 로딩 표시 — pathname/tick 재진입 시 이전 목록을 stale 로 잠깐 렌더하지 않게.
      setLoading(true);
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
  }, [tick, pathname]);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  const onAdd = useCallback(() => router.push('/planner/routine/new'), [router]);
  const onEdit = useCallback((id: string) => router.push(`/planner/routine/${id}`), [router]);

  // 카드 삭제 요청 — 즉시 삭제하지 않고 confirm 다이얼로그를 연다(타깃 세팅).
  const onDelete = useCallback((id: string) => {
    setDeleteTarget(routines.find((r) => r.id === id) ?? findRoutine(id) ?? null);
  }, [routines]);

  // confirm 후 실제 삭제 — bypass=mock+되돌리기, real=in-flight 가드+API+refresh. 완료 시 다이얼로그 닫음.
  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    const { id, title } = deleteTarget;
    // dev 우회 — 공유 mock store 에서 삭제 + 되돌리기 UX 유지 (엔티티 동일성 보존).
    if (DEV_AUTH_BYPASS) {
      const removed = removeRoutine(id);
      setDeleteTarget(null);
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
    setDeleteTarget(null); // 확인 시 다이얼로그는 항상 먼저 닫는다(in-flight 재확인 시 안 닫히는 회귀 방지).
    if (deletingIds.has(id)) return; // in-flight 중복 삭제 방어(연속 탭 → 성공 뒤 404 실패 토스트 방지).
    setDeletingIds((s) => new Set(s).add(id));
    void (async () => {
      try {
        await pullimPlannerClient.deleteRoutine(id);
        toast(`🗑 ${title} 삭제됨`);
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : '루틴 삭제 실패');
      } finally {
        setDeletingIds((s) => {
          const next = new Set(s);
          next.delete(id);
          return next;
        });
        refresh();
      }
    })();
  }, [deleteTarget, refresh, deletingIds]);

  return (
    <>
      <RoutineListPresenter
        routines={routines}
        loading={loading}
        loadError={loadError}
        onAdd={onAdd}
        onEdit={onEdit}
        onDelete={onDelete}
      />
      <RoutineDeleteConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        target={deleteTarget}
        onConfirm={confirmDelete}
      />
    </>
  );
}

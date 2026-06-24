'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getRoutines, removeRoutine, restoreRoutine, type Routine } from '@/lib/mock';
import RoutineListPresenter from '../presenters/RoutineListPresenter';

/**
 * 루틴 라이브러리 Container — mock store(getRoutines) 기반 CRUD 진입.
 * 실 BE(연기)는 pullim-api routines 로 교체.
 * App Router가 페이지 인스턴스를 재사용할 수 있어, **경로 진입마다 store와 재동기화**한다
 * (new/edit 저장 후 복귀 시 최신 목록 보장).
 */
export default function RoutineListContainer() {
  const router = useRouter();
  const pathname = usePathname();
  const [routines, setRoutines] = useState<Routine[]>(() => [...getRoutines()]);
  const refresh = useCallback(() => setRoutines([...getRoutines()]), []);

  // 목록 경로로 (재)진입할 때마다 store 재동기화 — 인스턴스 재사용 방어.
  // store→state 동기화는 의도된 setState (HomeContainer 패턴과 동일).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (pathname === '/planner/routine') refresh();
  }, [pathname, refresh]);

  const onAdd = useCallback(() => router.push('/planner/routine/new'), [router]);
  const onEdit = useCallback((id: string) => router.push(`/planner/routine/${id}`), [router]);

  const onDelete = useCallback((id: string) => {
    const removed = removeRoutine(id);
    if (!removed) return;
    refresh();
    toast(`🗑 ${removed.routine.title} 삭제됨`, {
      duration: 4000,
      action: {
        label: '되돌리기',
        onClick: () => {
          // 원래 id·위치 그대로 복원 — 엔티티 동일성 보존
          restoreRoutine(removed.routine, removed.index);
          refresh();
        },
      },
    });
  }, [refresh]);

  return (
    <RoutineListPresenter
      routines={routines}
      onAdd={onAdd}
      onEdit={onEdit}
      onDelete={onDelete}
    />
  );
}

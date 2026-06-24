'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { getRoutines, findRoutine, removeRoutine, addRoutine, type Routine } from '@/lib/mock';
import RoutineListPresenter from '../presenters/RoutineListPresenter';

/**
 * 루틴 라이브러리 Container — mock store(getRoutines) 기반 CRUD 진입.
 * 실 BE(연기)는 pullim-api routines 로 교체. mutation 후 refresh 로 재읽기.
 * (mock store는 모듈 메모리 — 폼에서 추가/편집 후 목록 재진입 시 자동 반영.)
 */
export default function RoutineListContainer() {
  const router = useRouter();
  const [routines, setRoutines] = useState<Routine[]>(() => [...getRoutines()]);
  const refresh = useCallback(() => setRoutines([...getRoutines()]), []);

  const onAdd = useCallback(() => router.push('/planner/routine/new'), [router]);
  const onEdit = useCallback((id: string) => router.push(`/planner/routine/${id}`), [router]);

  const onDelete = useCallback((id: string) => {
    const r = findRoutine(id);
    if (!r) return;
    removeRoutine(id);
    refresh();
    toast(`🗑 ${r.title} 삭제됨`, {
      duration: 4000,
      action: {
        label: '되돌리기',
        onClick: () => {
          // mock 복구 — 새 id 로 재삽입(라이브러리 항목 복원)
          addRoutine({
            title: r.title, subject: r.subject, type: r.type,
            startTime: r.startTime, endTime: r.endTime, weekdays: r.weekdays,
          });
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

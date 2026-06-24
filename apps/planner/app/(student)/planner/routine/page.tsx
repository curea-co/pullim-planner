import { Suspense } from 'react';
import RoutineListContainer from '@/components/features/planner-routine/containers/RoutineListContainer';

/** 루틴 라이브러리 — 반복 행동 목록(사용자 단위). 새 시간표 만들기 프로세스에서 적용. */
export default function RoutinePage() {
  return (
    <Suspense fallback={<div className="text-pullim-slate-400 py-10 text-center text-sm">루틴 불러오는 중…</div>}>
      <RoutineListContainer />
    </Suspense>
  );
}

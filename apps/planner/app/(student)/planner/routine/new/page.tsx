import { Suspense } from 'react';
import RoutineFormContainer from '@/components/features/planner-routine/containers/RoutineFormContainer';

/** 새 루틴 생성. */
export default function NewRoutinePage() {
  return (
    <Suspense fallback={<div className="text-pullim-slate-400 py-10 text-center text-sm">불러오는 중…</div>}>
      <RoutineFormContainer />
    </Suspense>
  );
}

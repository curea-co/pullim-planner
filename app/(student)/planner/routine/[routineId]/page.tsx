import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { ROUTINE_ENABLED } from '@/lib/flags';
import RoutineFormContainer from '@/components/features/planner-routine/containers/RoutineFormContainer';

/** 루틴 상세·편집. */
export default async function EditRoutinePage({
  params,
}: {
  params: Promise<{ routineId: string }>;
}) {
  if (!ROUTINE_ENABLED) redirect('/planner');
  const { routineId } = await params;
  return (
    <Suspense fallback={<div className="text-pullim-slate-400 py-10 text-center text-sm">불러오는 중…</div>}>
      <RoutineFormContainer routineId={routineId} />
    </Suspense>
  );
}

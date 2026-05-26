import { Suspense } from 'react';
import ManagePlannersContainer from '@/components/features/planner-manage/containers/ManagePlannersContainer';

/**
 * 시간표 관리 — N개 플래너 카드 그리드 + CRUD.
 *
 * IA: /planner/manage (Plan 3 본구현).
 * 빌더는 하위 라우트(/manage/new, /manage/[id]/edit)로 종속.
 */
export default function PlannerManagePage() {
  return (
    <Suspense fallback={<div className="text-pullim-slate-400 py-10 text-center text-sm">시간표 불러오는 중…</div>}>
      <ManagePlannersContainer />
    </Suspense>
  );
}

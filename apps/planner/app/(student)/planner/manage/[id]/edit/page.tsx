import { Suspense } from 'react';
import EditPlannerContainer from '@/components/features/planner-manage/containers/EditPlannerContainer';

/**
 * 기존 시간표 수정 — 빌더 with pre-fill (mode='edit').
 * 활성화 단계의 버튼 라벨이 "변경 사항 저장"으로 변경.
 *
 * Next 16: dynamic params는 Promise. Container 안에서 `use()`로 unwrap.
 * Suspense 경계 필수 — Container가 `use(params)` + `useSearchParams()` 사용.
 */
export default function PlannerEditPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="text-pullim-slate-400 py-10 text-center text-sm">시간표 불러오는 중…</div>}>
      <EditPlannerContainer params={params} />
    </Suspense>
  );
}

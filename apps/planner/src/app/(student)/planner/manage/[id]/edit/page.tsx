import EditPlannerContainer from '@/components/features/planner-manage/containers/EditPlannerContainer';

/**
 * 기존 시간표 수정 — 빌더 with pre-fill (mode='edit').
 * 활성화 단계의 버튼 라벨이 "변경 사항 저장"으로 변경.
 *
 * Next 16: dynamic params는 Promise. Container 안에서 `use()`로 unwrap.
 */
export default function PlannerEditPage({ params }: { params: Promise<{ id: string }> }) {
  return <EditPlannerContainer params={params} />;
}

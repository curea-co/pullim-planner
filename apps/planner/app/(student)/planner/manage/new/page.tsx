import { Suspense } from 'react';
import NewPlannerContainer from '@/components/features/planner-manage/containers/NewPlannerContainer';

/**
 * 학생 플래너 빌더 8단계 위저드 — *새 시간표 만들기*.
 * 목표 → 가용시간 → 과목 가중치 → 블록 패턴 → 약점 자동반영 → 동기 스타일 → 알림 → 미리보기·활성화.
 */
export default function PlannerBuilderNewPage() {
  return (
    <Suspense fallback={<div className="text-pullim-slate-400 py-10 text-center text-sm">빌더 불러오는 중…</div>}>
      <NewPlannerContainer />
    </Suspense>
  );
}

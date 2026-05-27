import { Suspense } from 'react';
import HomeContainer from '@/components/features/planner-home/containers/HomeContainer';

/**
 * 풀림 플래너 홈 — 활성 플래너의 시간표 (일/주/월 토글).
 *
 * Plan 4: 기존 `/planner/calendar`를 홈으로 흡수.
 *   - 다중 플래너 시대 — 헤더에 활성 플래너명 + "다른 시간표로 전환" 링크
 *   - 결정 표면(NEXT BLOCK·컨디션·번아웃)은 day-view에 이미 있어 그대로 활용
 *   - /planner/calendar 진입은 redirect로 호환
 */
export default function PlannerHomePage() {
  return (
    <Suspense fallback={<div className="text-pullim-slate-400 py-10 text-center text-sm">시간표 불러오는 중…</div>}>
      <HomeContainer />
    </Suspense>
  );
}

import { redirect } from 'next/navigation';

/**
 * 플래너 빌더는 시간표 관리(/planner/manage) 하위로 이전됨.
 * 기존 동선 보존을 위해 redirect 유지 (외부 링크/북마크 호환).
 */
export default function PlannerBuilderRedirect() {
  redirect('/planner/manage/new');
}

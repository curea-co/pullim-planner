import { redirect } from 'next/navigation';

/**
 * 기존 `/planner/calendar`는 Plan 4에서 홈(`/planner`)으로 흡수됨.
 * 외부 링크·북마크 호환을 위해 redirect 유지.
 *
 * 단순 mount-time redirect — view 파라미터는 손실. 필요 시 SearchParams 처리 추가.
 */
export default function PlannerCalendarRedirect() {
  redirect('/planner');
}

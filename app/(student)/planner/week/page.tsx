import { redirect } from 'next/navigation';

/** 일·주·월 시간표는 /planner로 통합됨 (Plan 4) */
export default function PlannerWeekRedirect() {
  redirect('/planner?view=week');
}

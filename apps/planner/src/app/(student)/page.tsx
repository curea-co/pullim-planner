import { redirect } from 'next/navigation';

/**
 * 플래너 전용 앱이라 홈 진입은 즉시 /planner로 보낸다.
 */
export default function HomePage() {
  redirect('/planner');
}

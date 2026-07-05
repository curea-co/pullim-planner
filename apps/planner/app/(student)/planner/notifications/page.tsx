import { Suspense } from 'react';
import NotificationsContainer from '@/components/features/planner-notifications/containers/NotificationsContainer';

export default function NotificationsPage() {
  return (
    <Suspense fallback={<div className="text-pullim-slate-400 py-10 text-center text-sm">불러오는 중…</div>}>
      <NotificationsContainer />
    </Suspense>
  );
}

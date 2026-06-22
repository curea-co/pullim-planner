import { Suspense } from 'react';
import FriendsContainer from '@/components/features/studygram/containers/FriendsContainer';

export default function ShareFriendsPage() {
  return (
    <Suspense fallback={<div className="text-pullim-slate-400 py-10 text-center text-sm">불러오는 중…</div>}>
      <FriendsContainer />
    </Suspense>
  );
}

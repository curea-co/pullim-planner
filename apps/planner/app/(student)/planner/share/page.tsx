import { Suspense } from 'react';
import ShareContainer from '@/components/features/studygram/containers/ShareContainer';

export default function SharePage() {
  return (
    <Suspense fallback={<div className="text-pullim-slate-400 py-10 text-center text-sm">불러오는 중…</div>}>
      <ShareContainer />
    </Suspense>
  );
}

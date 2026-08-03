import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { STUDYGRAM_ENABLED } from '@/lib/flags';
import ShareContainer from '@/components/features/studygram/containers/ShareContainer';

export default function SharePage() {
  if (!STUDYGRAM_ENABLED) redirect('/planner'); // 계정 연동 미비 — 우선순위 제외 게이트 (QA #20)
  return (
    <Suspense fallback={<div className="text-pullim-slate-400 py-10 text-center text-sm">불러오는 중…</div>}>
      <ShareContainer />
    </Suspense>
  );
}

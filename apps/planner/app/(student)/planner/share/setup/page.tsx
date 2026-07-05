import { Suspense } from 'react';
import SetupContainer from '@/components/features/studygram/containers/SetupContainer';

export default function ShareSetupPage() {
  return (
    <Suspense fallback={<div className="text-pullim-slate-400 py-10 text-center text-sm">불러오는 중…</div>}>
      <SetupContainer />
    </Suspense>
  );
}

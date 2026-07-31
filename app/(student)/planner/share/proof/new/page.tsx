import { Suspense } from 'react';
import NewProofContainer from '@/components/features/studygram/containers/NewProofContainer';

export default function NewProofPage() {
  return (
    <Suspense fallback={<div className="text-pullim-slate-400 py-10 text-center text-sm">불러오는 중…</div>}>
      <NewProofContainer />
    </Suspense>
  );
}

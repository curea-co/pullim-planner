import { Suspense } from 'react';
import ProofDetailContainer from '@/components/features/studygram/containers/ProofDetailContainer';

export default async function ProofDetailPage({
  params,
}: {
  params: Promise<{ proofId: string }>;
}) {
  const { proofId } = await params;
  return (
    <Suspense
      fallback={
        <div className="py-10 text-center text-sm text-pullim-slate-400">불러오는 중…</div>
      }
    >
      <ProofDetailContainer proofId={proofId} />
    </Suspense>
  );
}

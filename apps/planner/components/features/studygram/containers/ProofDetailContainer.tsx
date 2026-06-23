'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { mockStudyProofs, mockFriendProofs } from '@/lib/mock/studygram';
import ProofDetailPresenter from '../presenters/ProofDetailPresenter';

interface ProofDetailContainerProps {
  proofId: string;
}

export default function ProofDetailContainer({ proofId }: ProofDetailContainerProps) {
  const router = useRouter();
  const proof = [...mockStudyProofs, ...mockFriendProofs].find((p) => p.id === proofId);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  if (!proof) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        인증 카드를 찾을 수 없어요.{' '}
        <button
          type="button"
          onClick={handleBack}
          className="text-pullim-blue-600 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
        >
          돌아가기
        </button>
      </div>
    );
  }

  return <ProofDetailPresenter proof={proof} onBack={handleBack} />;
}

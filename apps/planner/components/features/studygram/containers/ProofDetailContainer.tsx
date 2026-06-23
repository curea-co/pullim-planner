'use client';

import { useCallback } from 'react';
import { useRouter, notFound } from 'next/navigation';
import { mockStudyProofs, mockFriendProofs } from '@/lib/mock/studygram';
import ProofDetailPresenter from '../presenters/ProofDetailPresenter';

interface ProofDetailContainerProps {
  proofId: string;
}

export default function ProofDetailContainer({ proofId }: ProofDetailContainerProps) {
  const router = useRouter();
  const proof = [...mockStudyProofs, ...mockFriendProofs].find((p) => p.id === proofId);

  // 히스토리가 없으면(직접 URL 진입 / 새 탭) 공유 허브로 fallback
  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/planner/share');
    }
  }, [router]);

  if (!proof) notFound();

  return <ProofDetailPresenter proof={proof} onBack={handleBack} />;
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ApiError } from '@pullim-planner/api-client';
import { mockStudyProofs, mockFriendProofs, type StudyProof } from '@/lib/mock/studygram';
import { pullimPlannerClient, pullimToStudyProof } from '@/lib/planner/pullim-client';
import ProofDetailPresenter from '../presenters/ProofDetailPresenter';

const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1';

interface ProofDetailContainerProps {
  proofId: string;
}

export default function ProofDetailContainer({ proofId }: ProofDetailContainerProps) {
  const router = useRouter();

  const [proof, setProof] = useState<StudyProof | null>(null);
  const [loading, setLoading] = useState(true);
  // 로드 실패(일시 장애)와 not-found(대상 없음)를 분리 — 네트워크·401·500 을 "없는 카드"로 오인하지 않게.
  const [loadError, setLoadError] = useState(false);
  const [notFoundProof, setNotFoundProof] = useState(false);

  // 단건 조회 엔드포인트가 없어(GET /proofs?scope 만) mine+friends 를 fetch 해 id 로 찾는다.
  // effect 본문 동기 setState 금지(cascading-render 린트) → async IIFE 안에서만 세팅(R3b 교훈).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError(false);
      setNotFoundProof(false);
      if (DEV_AUTH_BYPASS) {
        const found = [...mockStudyProofs, ...mockFriendProofs].find((p) => p.id === proofId);
        if (!cancelled) {
          if (found) setProof(found);
          else setNotFoundProof(true);
          setLoading(false);
        }
        return;
      }
      try {
        const [mine, friends] = await Promise.all([
          pullimPlannerClient.getProofs('mine'),
          pullimPlannerClient.getProofs('friends'),
        ]);
        const found = [...mine, ...friends]
          .map(pullimToStudyProof)
          .find((p) => p.id === proofId);
        if (!cancelled) {
          if (found) setProof(found);
          else setNotFoundProof(true);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(true);
          toast.error(e instanceof ApiError ? e.message : '인증카드를 불러오지 못했어요');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [proofId]);

  // 히스토리가 없으면(직접 URL 진입 / 새 탭) 공유 허브로 fallback
  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push('/planner/share');
    }
  }, [router]);

  if (loading) {
    return (
      <div className="text-pullim-slate-500 py-20 text-center text-sm">
        인증카드를 불러오는 중…
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="text-pullim-slate-500 py-20 text-center text-sm">
        인증카드를 불러오지 못했어요.{' '}
        <button
          type="button"
          onClick={handleBack}
          className="text-pullim-blue-600 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
        >
          공유로
        </button>
      </div>
    );
  }

  if (notFoundProof || !proof) {
    return (
      <div className="text-pullim-slate-500 py-20 text-center text-sm">
        인증카드를 찾을 수 없어요.{' '}
        <button
          type="button"
          onClick={handleBack}
          className="text-pullim-blue-600 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
        >
          공유로
        </button>
      </div>
    );
  }

  return <ProofDetailPresenter proof={proof} onBack={handleBack} />;
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, notFound } from 'next/navigation';
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
      // mine·friends 를 독립 처리(allSettled) — 내 카드 상세는 friends 피드 실패와 무관하게 떠야 한다.
      const [mineRes, friendsRes] = await Promise.allSettled([
        pullimPlannerClient.getProofs('mine'),
        pullimPlannerClient.getProofs('friends'),
      ]);
      if (cancelled) return;

      const mine = mineRes.status === 'fulfilled' ? mineRes.value : [];
      const friends = friendsRes.status === 'fulfilled' ? friendsRes.value : [];
      const anyRejected =
        mineRes.status === 'rejected' || friendsRes.status === 'rejected';

      const found = [...mine, ...friends]
        .map(pullimToStudyProof)
        .find((p) => p.id === proofId);

      // ① 찾으면 그 카드 렌더(어느 scope 가 실패했든 무관).
      if (found) {
        setProof(found);
        setLoading(false);
        return;
      }
      // ② 못 찾았는데 하나라도 실패 — 못 찾은 카드가 실패한 scope 에 있었을 수 있으므로 not-found 로
      //    단정하지 않고 loadError(재시도). (부분 실패를 '없는 카드'로 오인 금지.)
      if (anyRejected) {
        setLoadError(true);
        const err =
          mineRes.status === 'rejected'
            ? mineRes.reason
            : friendsRes.status === 'rejected'
              ? friendsRes.reason
              : undefined;
        toast.error(err instanceof ApiError ? err.message : '인증카드를 불러오지 못했어요');
        setLoading(false);
        return;
      }
      // ③ 전 scope 성공 + 미발견 — 그때만 진짜 not-found.
      setNotFoundProof(true);
      setLoading(false);
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

  // 일시 장애(네트워크·부분 실패 후 미발견) — 404 가 아니라 재시도 가능한 inline 안내(200).
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

  // 진짜 미발견(전 scope 성공 + 미발견, 또는 bypass mock 미발견) — Next 404. 잘못된 링크를
  // 정상 페이지(200)로 보여주지 않는다(원래 동작 복원).
  if (notFoundProof || !proof) {
    notFound();
  }

  return <ProofDetailPresenter proof={proof} onBack={handleBack} />;
}

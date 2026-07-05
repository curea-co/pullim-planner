'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, notFound } from 'next/navigation';
import { toast } from 'sonner';
import { ApiError } from '@pullim-planner/api-client';
import { mockStudyProofs, mockFriendProofs, type StudyProof } from '@/lib/mock/studygram';
import { pullimPlannerClient, pullimToStudyProof } from '@/lib/planner/pullim-client';
import ProofDetailPresenter from '../presenters/ProofDetailPresenter';

const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1';

// 응원 이모지 — 단일 프리셋(BE 계약 emoji 1~8자, per-user·per-emoji 멱등).
const REACTION_EMOJI = '🔥';

interface ProofDetailContainerProps {
  proofId: string;
}

type ProofFetchResult =
  | { kind: 'found'; proof: StudyProof }
  | { kind: 'not-found' }
  | { kind: 'error'; reason: unknown };

/**
 * proofId 단건 조회 — 단건 엔드포인트가 없어(GET /proofs?scope 만) mine+friends 를 fetch 해 id 로
 * 찾는다. 초기 로드 effect 와 응원 토글 성공 후 카운트 재동기화가 공유한다(throw 없음 — allSettled).
 * mine·friends 는 독립 처리 — 내 카드 상세는 friends 피드 실패와 무관하게 떠야 한다.
 */
async function fetchProofById(proofId: string): Promise<ProofFetchResult> {
  if (DEV_AUTH_BYPASS) {
    const found = [...mockStudyProofs, ...mockFriendProofs].find((p) => p.id === proofId);
    return found ? { kind: 'found', proof: found } : { kind: 'not-found' };
  }
  const [mineRes, friendsRes] = await Promise.allSettled([
    pullimPlannerClient.getProofs('mine'),
    pullimPlannerClient.getProofs('friends'),
  ]);
  const mine = mineRes.status === 'fulfilled' ? mineRes.value : [];
  const friends = friendsRes.status === 'fulfilled' ? friendsRes.value : [];
  const found = [...mine, ...friends].map(pullimToStudyProof).find((p) => p.id === proofId);
  // ① 찾으면 그 카드(어느 scope 가 실패했든 무관).
  if (found) return { kind: 'found', proof: found };
  // ② 못 찾았는데 하나라도 실패 — 못 찾은 카드가 실패한 scope 에 있었을 수 있으므로 not-found 로
  //    단정하지 않고 error(재시도 가능). (부분 실패를 '없는 카드'로 오인 금지.)
  if (mineRes.status === 'rejected' || friendsRes.status === 'rejected') {
    return {
      kind: 'error',
      reason:
        mineRes.status === 'rejected'
          ? mineRes.reason
          : friendsRes.status === 'rejected'
            ? friendsRes.reason
            : undefined,
    };
  }
  // ③ 전 scope 성공 + 미발견 — 그때만 진짜 not-found.
  return { kind: 'not-found' };
}

export default function ProofDetailContainer({ proofId }: ProofDetailContainerProps) {
  const router = useRouter();

  const [proof, setProof] = useState<StudyProof | null>(null);
  const [loading, setLoading] = useState(true);
  // 로드 실패(일시 장애)와 not-found(대상 없음)를 분리 — 네트워크·401·500 을 "없는 카드"로 오인하지 않게.
  const [loadError, setLoadError] = useState(false);
  const [notFoundProof, setNotFoundProof] = useState(false);
  // 내 응원 여부 — BE 가 내 리액션 목록을 내리지 않아 세션 내 로컬 추적(초기 false). add/remove 는
  // per-user·per-emoji 멱등이라 과거 응원과 겹쳐도 서버 상태는 안전하다.
  const [reacted, setReacted] = useState(false);
  // 응원 토글 in-flight — 더블탭에 낙관 갱신이 겹치지 않게(멱등 BE 지만 카운트 이중 반영 방지).
  const reactionInFlight = useRef(false);

  // 초기 로드 — fetchProofById(공유 헬퍼) 결과를 화면 상태로 매핑한다.
  // effect 본문 동기 setState 금지(cascading-render 린트) → async IIFE 안에서만 세팅(R3b 교훈).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError(false);
      setNotFoundProof(false);
      // proofId 전환 시 이전 카드의 응원 상태가 새 카드로 이월되지 않게 리셋(Codex #115-1).
      setReacted(false);
      const result = await fetchProofById(proofId);
      if (cancelled) return;
      if (result.kind === 'found') {
        setProof(result.proof);
      } else if (result.kind === 'error') {
        setLoadError(true);
        toast.error(
          result.reason instanceof ApiError
            ? result.reason.message
            : '인증카드를 불러오지 못했어요',
        );
      } else {
        setNotFoundProof(true);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [proofId]);

  // 응원 토글 — 낙관 갱신(reactionCount ±1) 후 실 API, 실패 시 롤백+토스트. bypass 는 로컬 흉내만.
  const handleToggleReaction = useCallback(() => {
    if (!proof || reactionInFlight.current) return;
    const next = !reacted;
    const apply = (p: StudyProof | null, delta: number): StudyProof | null =>
      p && { ...p, reactionCount: Math.max(0, p.reactionCount + delta) };
    setReacted(next);
    setProof((prev) => apply(prev, next ? 1 : -1));
    if (DEV_AUTH_BYPASS) return; // mock — 서버 없이 로컬 상태만(기존 bypass 동작 유지).
    reactionInFlight.current = true;
    void (async () => {
      try {
        if (next) await pullimPlannerClient.addReaction(proof.id, REACTION_EMOJI);
        else await pullimPlannerClient.removeReaction(proof.id, REACTION_EMOJI);
        // 성공 후 서버 재조회로 카운트 수렴(Codex #115-2) — reacted 초기값 false 가정 탓에 이미
        // 서버에 내 응원이 있던 사용자의 add 가 멱등 no-op 인데 낙관 +1 로 남는 표시 오차를 서버
        // 정확값으로 교체한다(낙관 ±1 은 즉각 반응용 유지). fetchProofById 는 throw 없음(allSettled)
        // — 재조회 실패(kind≠found)는 조용히 무시(낙관값 유지, 다음 진입 시 수렴).
        const result = await fetchProofById(proof.id);
        if (result.kind === 'found') setProof(result.proof);
      } catch (e) {
        // 롤백 — 404(미가시·미존재 비구분, enumeration 저항) 포함 실패 사유는 generic 안내.
        setReacted(!next);
        setProof((prev) => apply(prev, next ? -1 : 1));
        toast.error(e instanceof ApiError ? e.message : '응원을 반영하지 못했어요');
      } finally {
        reactionInFlight.current = false;
      }
    })();
  }, [proof, reacted]);

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

  return (
    <ProofDetailPresenter
      proof={proof}
      onBack={handleBack}
      reacted={reacted}
      onToggleReaction={handleToggleReaction}
    />
  );
}

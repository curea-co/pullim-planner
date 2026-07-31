'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import { mockFriends, searchDiscoverableUsers } from '@/lib/mock/studygram';
import {
  pullimPlannerClient,
  pullimToDiscoverableUser,
  pullimToFriend,
} from '@/lib/planner/pullim-client';
import type { Friend, DiscoverableUser } from '../types';
import FriendsPresenter from '../presenters/FriendsPresenter';

const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1';

// 검색 디바운스 — 타이핑마다 discover 호출 폭주 방지.
const SEARCH_DEBOUNCE_MS = 300;

export default function FriendsContainer() {
  const [friends, setFriends] = useState<Friend[]>(DEV_AUTH_BYPASS ? mockFriends : []);
  const [query, setQuery] = useState('');
  const [requestedIds, setRequestedIds] = useState<string[]>([]);
  // real 검색 결과 — bypass 는 아래 useMemo(mock 동기 검색)를 쓴다.
  const [realSearchResults, setRealSearchResults] = useState<DiscoverableUser[]>([]);
  // 목록 로드 — 실패(일시 장애)는 빈 목록과 구분해 재시도 안내(R3b 미러).
  const [loading, setLoading] = useState(!DEV_AUTH_BYPASS);
  const [loadError, setLoadError] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);
  // mutation in-flight 가드 — 대상별 키(더블탭 방어). state 재렌더 불요라 ref.
  const inFlight = useRef(new Set<string>());

  // 목록 로드(마운트+재시도) — bypass=mock 즉시.
  // effect 본문 동기 setState 금지(cascading-render 린트) → async IIFE 안에서만 세팅(R3b 교훈).
  useEffect(() => {
    if (DEV_AUTH_BYPASS) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const rows = await pullimPlannerClient.getFriends();
        if (!cancelled) setFriends(rows.map(pullimToFriend));
      } catch (e) {
        if (!cancelled) {
          setLoadError(true);
          toast.error(e instanceof ApiError ? e.message : '친구 목록을 불러오지 못했어요');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  // 수락/차단 후 목록 재조회 — mutation 성공과 분리해 실패해도 성공 토스트를 오염하지 않는다.
  const refreshFriends = useCallback(async () => {
    try {
      const rows = await pullimPlannerClient.getFriends();
      setFriends(rows.map(pullimToFriend));
    } catch {
      toast.error('친구 목록을 새로고침하지 못했어요');
    }
  }, []);

  const accepted = friends.filter((f) => f.status === 'accepted');
  const pending = friends.filter((f) => f.status === 'pending');

  // 이미 친구/요청중(pending)인 userId 는 검색 결과에서 제외(기존 mock excludeIds 로직 미러).
  const excludeIds = useMemo(() => new Set(friends.map((f) => f.userId)), [friends]);

  // real 검색 — 디바운스 후 discoverUsers 호출. BE 계약: q 는 trim 1~20자(위반 400)라 범위 밖이면
  // 호출하지 않고 결과만 비운다. 검색 실패는 토스트(목록 loadError 와 분리 — 목록은 유지).
  useEffect(() => {
    if (DEV_AUTH_BYPASS) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        const q = query.trim();
        if (q.length < 1 || q.length > 20) {
          if (!cancelled) setRealSearchResults([]);
          return;
        }
        try {
          const rows = await pullimPlannerClient.discoverUsers(q);
          if (!cancelled) {
            setRealSearchResults(
              rows.map(pullimToDiscoverableUser).filter((u) => !excludeIds.has(u.userId)),
            );
          }
        } catch (e) {
          if (!cancelled) {
            // 이전 쿼리 결과 잔존 방지(Codex #115-3) — 실패 토스트와 옛 결과가 함께 보이는 혼란 제거.
            setRealSearchResults([]);
            toast.error(e instanceof ApiError ? e.message : '친구 검색에 실패했어요');
          }
        }
      })();
    }, SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, excludeIds]);

  // bypass 검색 — 기존 mock 동기 검색 유지.
  const bypassSearchResults = useMemo(
    () =>
      DEV_AUTH_BYPASS
        ? searchDiscoverableUsers(
            query,
            friends.map((f) => f.userId),
          )
        : [],
    [query, friends],
  );

  const searchResults = DEV_AUTH_BYPASS ? bypassSearchResults : realSearchResults;

  const handleSendRequest = useCallback((user: DiscoverableUser) => {
    if (DEV_AUTH_BYPASS) {
      setRequestedIds((prev) => (prev.includes(user.userId) ? prev : [...prev, user.userId]));
      toast.success(`${user.name}님에게 친구 요청을 보냈어요.`);
      return;
    }
    const key = `send:${user.userId}`;
    if (inFlight.current.has(key)) return; // 같은 대상 더블탭 방어.
    inFlight.current.add(key);
    void (async () => {
      try {
        await pullimPlannerClient.sendFriendRequest(user.userId);
        setRequestedIds((prev) => (prev.includes(user.userId) ? prev : [...prev, user.userId]));
        toast.success(`${user.name}님에게 친구 요청을 보냈어요.`);
      } catch (e) {
        // 409(차단 관계·중복 등)·400 — 사유 비구분 generic(BE enumeration 저항 정책 미러).
        if (e instanceof ApiError && (e.statusCode === 409 || e.statusCode === 400)) {
          toast.error('지금은 친구 요청을 보낼 수 없어요');
        } else {
          toast.error(e instanceof ApiError ? e.message : '친구 요청을 보내지 못했어요');
        }
      } finally {
        inFlight.current.delete(key);
      }
    })();
  }, []);

  // 수락/차단 공통 — respondFriend 성공 후 목록 refresh. 403(비수신자 accept)·404(미존재) generic.
  const respond = useCallback(
    (id: string, action: 'accept' | 'block') => {
      const key = `respond:${id}`;
      if (inFlight.current.has(key)) return;
      inFlight.current.add(key);
      void (async () => {
        try {
          await pullimPlannerClient.respondFriend(id, action);
        } catch {
          toast.error('요청을 처리하지 못했어요');
          inFlight.current.delete(key);
          return;
        }
        if (action === 'accept') toast.success('친구 요청을 수락했어요.');
        else toast('친구 요청을 거절했어요.');
        await refreshFriends();
        inFlight.current.delete(key);
      })();
    },
    [refreshFriends],
  );

  const handleAccept = useCallback(
    (id: string) => {
      if (DEV_AUTH_BYPASS) {
        setFriends((prev) =>
          prev.map((f) => (f.id === id ? { ...f, status: 'accepted' as const } : f)),
        );
        toast.success('친구 요청을 수락했어요.');
        return;
      }
      respond(id, 'accept');
    },
    [respond],
  );

  // 거절 = BE block(요청 응답 액션은 accept|block 2종 — 거절도 관계를 blocked 로 닫는다).
  const handleReject = useCallback(
    (id: string) => {
      if (DEV_AUTH_BYPASS) {
        setFriends((prev) => prev.filter((f) => f.id !== id));
        toast('친구 요청을 거절했어요.');
        return;
      }
      respond(id, 'block');
    },
    [respond],
  );

  const handleToggleCloseFriend = useCallback(
    (id: string) => {
      if (DEV_AUTH_BYPASS) {
        setFriends((prev) =>
          prev.map((f) => (f.id === id ? { ...f, isCloseFriend: !f.isCloseFriend } : f)),
        );
        return;
      }
      const target = friends.find((f) => f.id === id);
      if (!target) return;
      const key = `close:${id}`;
      if (inFlight.current.has(key)) return;
      inFlight.current.add(key);
      const nextClose = !target.isCloseFriend;
      void (async () => {
        try {
          // close-friends path param 은 friendship id 가 아니라 상대 userId(BE 방향성 edge 계약).
          if (nextClose) await pullimPlannerClient.setCloseFriend(target.userId);
          else await pullimPlannerClient.removeCloseFriend(target.userId);
          // 성공 확정 후 로컬 반영(멱등 API — 재조회 불요, 낙관 갱신+롤백보다 단순).
          setFriends((prev) =>
            prev.map((f) => (f.id === id ? { ...f, isCloseFriend: nextClose } : f)),
          );
        } catch (e) {
          // 409(accepted 친구 아님 등) 포함 사유 비구분 generic.
          if (e instanceof ApiError && e.statusCode === 409) {
            toast.error('지금은 친한 친구로 지정할 수 없어요');
          } else {
            toast.error(e instanceof ApiError ? e.message : '친한 친구 설정을 반영하지 못했어요');
          }
        } finally {
          inFlight.current.delete(key);
        }
      })();
    },
    [friends],
  );

  if (loading) {
    return (
      <div className="text-pullim-slate-500 py-20 text-center text-sm">
        친구 목록을 불러오는 중…
      </div>
    );
  }

  // 로드 실패(일시 장애) — 빈 목록(정상)과 구분해 재시도 제공.
  if (loadError) {
    return (
      <div className="text-pullim-slate-500 py-20 text-center text-sm">
        친구 목록을 불러오지 못했어요.{' '}
        <button
          type="button"
          onClick={() => setReloadTick((t) => t + 1)}
          className="text-pullim-blue-600 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <FriendsPresenter
      accepted={accepted}
      pending={pending}
      query={query}
      searchResults={searchResults}
      requestedIds={requestedIds}
      onQueryChange={setQuery}
      onSendRequest={handleSendRequest}
      onAccept={handleAccept}
      onReject={handleReject}
      onToggleCloseFriend={handleToggleCloseFriend}
    />
  );
}

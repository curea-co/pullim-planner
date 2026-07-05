'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@pullim-planner/api-client';
import SharePresenter, { type ShareTab } from '../presenters/SharePresenter';
import {
  mockStudygramSetting,
  mockStudyProofs,
  mockFriends,
  mockFriendProofs,
  hasTodayProof,
  calcGoalProgress,
  todayKST,
  type StudyProof,
  type StudygramSetting,
  type Friend,
} from '@/lib/mock/studygram';
import {
  pullimPlannerClient,
  pullimToFriend,
  pullimToStudyProof,
  pullimToStudygramSetting,
} from '@/lib/planner/pullim-client';

const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1';

const TODAY = todayKST();

export default function ShareContainer() {
  // 내 인증 탭 제거 → 친구 시간표(인바운드)만. 기본 탭 'friends'.
  const [activeTab, setActiveTab] = useState<ShareTab>('friends');

  // bypass=mock 즉시, real=allSettled 병렬 로드(아래 effect).
  const [setting, setSetting] = useState<StudygramSetting | null>(
    DEV_AUTH_BYPASS ? mockStudygramSetting : null,
  );
  // 설정 로드 실패 — null(미온보딩, 온보딩 유도 정상)과 구분해 온보딩 EmptyState 오표시를 막는다.
  const [settingFailed, setSettingFailed] = useState(false);
  const [myProofs, setMyProofs] = useState<StudyProof[]>(DEV_AUTH_BYPASS ? mockStudyProofs : []);
  // 내 카드 로드 실패 — 목표 진행률(posted)이 미지수라 위젯을 숨긴다(0 으로 오표시 금지).
  const [myProofsFailed, setMyProofsFailed] = useState(false);
  const [friendProofs, setFriendProofs] = useState<StudyProof[]>(
    DEV_AUTH_BYPASS ? mockFriendProofs : [],
  );
  const [friends, setFriends] = useState<Friend[]>(DEV_AUTH_BYPASS ? mockFriends : []);
  // 친구 조회 실패(미지수) — 빈 목록(친구 없음 확정)과 구분해 '친구 없음' empty state 오표시를
  // 막는다(settingFailed 와 동형 — Codex #115 R2).
  const [friendsFailed, setFriendsFailed] = useState(false);
  const [loading, setLoading] = useState(!DEV_AUTH_BYPASS);
  // 전 소스 실패에만 전면 loadError+재시도 — 부분 실패는 성공분으로 화면을 세운다(부분실패 격리).
  const [loadError, setLoadError] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  // real 로드 — 4소스 병렬(allSettled) 부분실패 격리: 피드가 실패해도 목표/CTA 는 뜨고, 반대도.
  // effect 본문 동기 setState 금지(cascading-render 린트) → async IIFE 안에서만 세팅(R3b 교훈).
  useEffect(() => {
    if (DEV_AUTH_BYPASS) return;
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError(false);
      const [settingRes, mineRes, feedRes, friendsRes] = await Promise.allSettled([
        pullimPlannerClient.getSetting(),
        pullimPlannerClient.getProofs('mine'),
        pullimPlannerClient.getProofs('friends'),
        pullimPlannerClient.getFriends(),
      ]);
      if (cancelled) return;

      const results = [settingRes, mineRes, feedRes, friendsRes];
      // 전부 실패 — 세울 화면이 없다. 전면 loadError+재시도.
      if (results.every((r) => r.status === 'rejected')) {
        setLoadError(true);
        const reason = settingRes.status === 'rejected' ? settingRes.reason : undefined;
        toast.error(
          reason instanceof ApiError ? reason.message : '공유 데이터를 불러오지 못했어요',
        );
        setLoading(false);
        return;
      }

      if (settingRes.status === 'fulfilled') {
        // null = 미온보딩 — 프리젠터가 온보딩 EmptyState(no-setting)로 유도한다(기존 UI 재사용).
        setSetting(settingRes.value ? pullimToStudygramSetting(settingRes.value) : null);
        setSettingFailed(false);
      } else {
        setSettingFailed(true);
      }
      if (mineRes.status === 'fulfilled') {
        setMyProofs(mineRes.value.map(pullimToStudyProof));
        setMyProofsFailed(false);
      } else {
        setMyProofsFailed(true);
      }
      if (feedRes.status === 'fulfilled') {
        setFriendProofs(feedRes.value.map(pullimToStudyProof));
      }
      if (friendsRes.status === 'fulfilled') {
        setFriends(friendsRes.value.map(pullimToFriend));
        setFriendsFailed(false);
      } else {
        setFriendsFailed(true);
      }
      if (results.some((r) => r.status === 'rejected')) {
        toast.error('일부 데이터를 불러오지 못했어요');
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadTick]);

  const acceptedFriends = useMemo(
    () => friends.filter((f) => f.status === 'accepted'),
    [friends],
  );

  // 내 카드 로드 실패면 posted 미지수 — 목표 위젯을 숨긴다(null).
  const goalProgress =
    setting && !myProofsFailed ? calcGoalProgress(myProofs, setting, TODAY) : null;

  // 내 카드 로드 실패 시 CTA 는 노출(false) — 게시 화면(NewProof)이 BR-2(하루 1장)를 재확인·409 방어한다.
  const todayProof = myProofsFailed ? false : hasTodayProof(myProofs, TODAY);

  const handleChangeTab = useCallback((tab: ShareTab) => {
    setActiveTab(tab);
  }, []);

  if (loading) {
    return (
      <div className="text-pullim-slate-500 py-20 text-center text-sm">
        공유 데이터를 불러오는 중…
      </div>
    );
  }

  // 전 소스 실패(일시 장애) — 온보딩 EmptyState 로 오인하지 않게 전면 재시도 안내.
  if (loadError) {
    return (
      <div className="text-pullim-slate-500 py-20 text-center text-sm">
        공유 데이터를 불러오지 못했어요.{' '}
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
    <SharePresenter
      setting={setting}
      settingUnknown={settingFailed}
      friendProofs={friendProofs}
      acceptedFriends={acceptedFriends}
      friendsUnknown={friendsFailed}
      goalProgress={goalProgress}
      activeTab={activeTab}
      hasTodayProof={todayProof}
      onChangeTab={handleChangeTab}
    />
  );
}

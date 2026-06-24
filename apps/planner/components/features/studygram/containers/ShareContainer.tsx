'use client';

import { useState, useCallback, useMemo } from 'react';
import SharePresenter, { type ShareTab } from '../presenters/SharePresenter';
import {
  mockStudygramSetting,
  mockStudyProofs,
  mockFriends,
  mockFriendProofs,
  hasTodayProof,
  calcGoalProgress,
  todayKST,
} from '@/lib/mock/studygram';

const TODAY = todayKST();

export default function ShareContainer() {
  // 내 인증 탭 제거 → 친구 시간표(인바운드)만. 기본 탭 'friends'.
  const [activeTab, setActiveTab] = useState<ShareTab>('friends');

  const setting = mockStudygramSetting;
  // myProofs는 목표 진행률·오늘 인증 여부 계산에만 사용(목록 노출 X).
  const myProofs = mockStudyProofs;
  const friends = mockFriends;
  const friendProofs = mockFriendProofs;

  const acceptedFriends = useMemo(
    () => friends.filter((f) => f.status === 'accepted'),
    [friends],
  );

  const goalProgress = setting
    ? calcGoalProgress(myProofs, setting, TODAY)
    : null;

  const todayProof = hasTodayProof(myProofs, TODAY);

  const handleChangeTab = useCallback((tab: ShareTab) => {
    setActiveTab(tab);
  }, []);

  return (
    <SharePresenter
      setting={setting}
      friendProofs={friendProofs}
      acceptedFriends={acceptedFriends}
      goalProgress={goalProgress}
      activeTab={activeTab}
      hasTodayProof={todayProof}
      onChangeTab={handleChangeTab}
    />
  );
}

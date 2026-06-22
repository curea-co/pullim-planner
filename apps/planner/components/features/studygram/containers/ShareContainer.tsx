'use client';

import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import SharePresenter, { type ShareTab } from '../presenters/SharePresenter';
import {
  mockStudygramSetting,
  mockStudyProofs,
  mockFriends,
  mockFriendProofs,
  hasTodayProof,
  calcGoalProgress,
} from '@/lib/mock/studygram';

const TODAY = new Date().toISOString().slice(0, 10);

export default function ShareContainer() {
  const [activeTab, setActiveTab] = useState<ShareTab>('mine');

  const setting = mockStudygramSetting;
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

  // 인증카드 상세 화면(/planner/share/[id])은 후속 PR 범위 — 현재는 안내 토스트로 대체해
  // 미존재 라우트로의 404 이동을 막는다.
  const handleProofClick = useCallback(() => {
    toast('인증 카드 상세는 곧 열려요');
  }, []);

  return (
    <SharePresenter
      setting={setting}
      myProofs={myProofs}
      friendProofs={friendProofs}
      acceptedFriends={acceptedFriends}
      goalProgress={goalProgress}
      activeTab={activeTab}
      hasTodayProof={todayProof}
      onChangeTab={handleChangeTab}
      onProofClick={handleProofClick}
    />
  );
}

'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
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

  const handleProofClick = useCallback((id: string) => {
    router.push(`/planner/share/${id}`);
  }, [router]);

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

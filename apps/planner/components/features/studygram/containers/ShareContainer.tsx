'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import SharePresenter, { type ShareTab } from '../presenters/SharePresenter';
import {
  mockStudygramSetting,
  mockStudyProofs,
  mockFriends,
  mockFriendProofs,
  hasTodayProof,
  calcGoalProgress,
} from '@/lib/mock/studygram';

const TODAY = '2026-06-22';

export default function ShareContainer() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ShareTab>('mine');

  const setting = mockStudygramSetting;
  const myProofs = mockStudyProofs;
  const friends = mockFriends;
  const friendProofs = mockFriendProofs;

  const goalProgress = setting
    ? calcGoalProgress(myProofs, setting, TODAY)
    : null;

  const todayProof = hasTodayProof(myProofs, TODAY);

  const handleChangeTab = useCallback((tab: ShareTab) => {
    setActiveTab(tab);
  }, []);

  const handleProofClick = useCallback(
    (proofId: string) => {
      router.push(`/planner/share/${proofId}`);
    },
    [router],
  );

  return (
    <SharePresenter
      setting={setting}
      myProofs={myProofs}
      friendProofs={friendProofs}
      friends={friends}
      goalProgress={goalProgress}
      activeTab={activeTab}
      hasTodayProof={todayProof}
      onChangeTab={handleChangeTab}
    />
  );
}

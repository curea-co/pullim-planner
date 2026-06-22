'use client';

import Link from 'next/link';
import { Settings, Users, PlusCircle } from 'lucide-react';
import type { StudyProof, StudygramSetting, Friend } from '../types';
import { ProofCard } from '../components/proof-card';
import { GoalProgressWidget } from '../components/goal-progress-widget';
import { EmptyState } from '../components/empty-state';
import { PageHeader } from '@/components/shell/page-header';

export type ShareTab = 'mine' | 'friends';

interface SharePresenterProps {
  setting: StudygramSetting | null;
  myProofs: StudyProof[];
  friendProofs: StudyProof[];
  friends: Friend[];
  goalProgress: { posted: number; goalTotal: number; remainDays: number; streakDays: number } | null;
  activeTab: ShareTab;
  hasTodayProof: boolean;
  onChangeTab: (tab: ShareTab) => void;
}

export default function SharePresenter({
  setting,
  myProofs,
  friendProofs,
  friends,
  goalProgress,
  activeTab,
  hasTodayProof,
  onChangeTab,
}: SharePresenterProps) {
  const acceptedFriends = friends.filter((f) => f.status === 'accepted');

  return (
    <>
      <PageHeader
        title="공유"
        description="꾸준함을 기록하고 친구와 나눠요"
        action={
          <div className="flex items-center gap-2">
            <Link
              href="/planner/share/friends"
              aria-label="친구 관리"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-pullim-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
            >
              <Users className="h-4 w-4" />
            </Link>
            <Link
              href="/planner/share/setup"
              aria-label="공유 세팅"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-pullim-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
            >
              <Settings className="h-4 w-4" />
            </Link>
          </div>
        }
      />

      <div className="space-y-4">
        {/* 세팅 미완 → 유도 */}
        {!setting ? (
          <EmptyState variant="no-setting" />
        ) : (
          <>
            {/* 목표 진행 위젯 */}
            {goalProgress && (
              <GoalProgressWidget
                posted={goalProgress.posted}
                goalTotal={goalProgress.goalTotal}
                remainDays={goalProgress.remainDays}
                streakDays={goalProgress.streakDays}
                topicLine={setting.topicLine}
              />
            )}

            {/* 오늘 인증 CTA */}
            {!hasTodayProof && (
              <Link
                href="/planner/share/proof/new"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-pullim-blue-300 bg-pullim-blue-50 py-4 text-sm font-bold text-pullim-blue-600 hover:bg-pullim-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
              >
                <PlusCircle className="h-4 w-4" />
                오늘 공부, 한 장으로 인증하기
              </Link>
            )}

            {/* 탭 토글 */}
            <div className="flex rounded-lg bg-pullim-slate-100 p-0.5">
              {(['mine', 'friends'] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => onChangeTab(tab)}
                  className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 focus-visible:ring-offset-1 ${
                    activeTab === tab
                      ? 'bg-background text-foreground shadow-pullim-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {tab === 'mine' ? `내 인증 ${myProofs.length}` : `친구 피드 ${acceptedFriends.length}`}
                </button>
              ))}
            </div>

            {/* 탭 콘텐츠 */}
            {activeTab === 'mine' && (
              myProofs.length === 0 ? (
                <EmptyState variant="no-proofs" />
              ) : (
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {myProofs.map((proof) => (
                    <ProofCard
                      key={proof.id}
                      proof={proof}
                      variant="grid"
                      onClick={() => {/* 상세 라우팅은 Container에서 처리 */}}
                    />
                  ))}
                </div>
              )
            )}

            {activeTab === 'friends' && (
              acceptedFriends.length === 0 ? (
                <EmptyState variant="no-friends" />
              ) : friendProofs.length === 0 ? (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  친구들이 아직 오늘 인증을 안 했어요
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {friendProofs.map((proof) => {
                    const friend = friends.find((f) => f.userId === proof.userId);
                    return (
                      <ProofCard
                        key={proof.id}
                        proof={proof}
                        ownerName={friend?.name}
                        variant="grid"
                      />
                    );
                  })}
                </div>
              )
            )}
          </>
        )}
      </div>
    </>
  );
}

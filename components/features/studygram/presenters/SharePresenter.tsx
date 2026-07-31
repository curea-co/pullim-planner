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
  /**
   * 설정 로드 실패(미지수) — null(미온보딩 확정)과 구분한다. true 면 온보딩 EmptyState 를 띄우지
   * 않고(온보딩 완료 사용자 오유도 방지) 목표/CTA 만 생략한 채 피드는 그대로 렌더한다(부분실패 격리).
   */
  settingUnknown?: boolean;
  friendProofs: StudyProof[];
  /**
   * 피드 조회 실패(미지수) — 빈 피드('친구들이 아직 오늘 미인증' 정상)와 구분한다. true 면 미인증
   * 안내 대신 소프트 실패 안내를 띄운다(컨테이너가 실패 시 피드를 비워 전달 — stale 값 없음,
   * Codex #115 R3).
   */
  feedUnknown?: boolean;
  acceptedFriends: Friend[];
  /**
   * 친구 조회 실패(미지수) — 빈 acceptedFriends(친구 없음 확정)와 구분한다. true 면 '친구 없음'
   * empty state(초대 CTA)로 오유도하지 않고 소프트 안내만 띄운다(settingUnknown 동형 — 부분실패
   * 격리, Codex #115 R2). 피드(friendProofs)가 있으면 기존처럼 그리드 우선.
   */
  friendsUnknown?: boolean;
  goalProgress: { posted: number; goalTotal: number; remainDays: number; streakDays: number } | null;
  activeTab: ShareTab;
  hasTodayProof: boolean;
  onChangeTab: (tab: ShareTab) => void;
}

export default function SharePresenter({
  setting,
  settingUnknown = false,
  friendProofs,
  feedUnknown = false,
  acceptedFriends,
  friendsUnknown = false,
  goalProgress,
  activeTab,
  hasTodayProof,
  onChangeTab,
}: SharePresenterProps) {
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
        {!setting && !settingUnknown ? (
          <EmptyState variant="no-setting" />
        ) : (
          <>
            {setting && goalProgress && (
              <GoalProgressWidget
                posted={goalProgress.posted}
                goalTotal={goalProgress.goalTotal}
                remainDays={goalProgress.remainDays}
                streakDays={goalProgress.streakDays}
                topicLine={setting.topicLine}
              />
            )}

            {setting && !hasTodayProof && (
              <Link
                href="/planner/share/proof/new"
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-pullim-blue-300 bg-pullim-blue-50 py-4 text-sm font-bold text-pullim-blue-600 hover:bg-pullim-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
              >
                <PlusCircle className="h-4 w-4" />
                오늘 공부, 한 장으로 인증하기
              </Link>
            )}

            {/* 친구 시간표 탭 — 친구가 공유한 시간표(인바운드). 내 인증 탭은 제거됨. */}
            <div className="flex rounded-lg bg-pullim-slate-100 p-0.5">
              {(['friends'] as const).map((tab) => (
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
                  친구 시간표 {friendProofs.length}
                </button>
              ))}
            </div>

            {/* 피드가 있으면 친구 목록 조회 실패(빈 acceptedFriends)와 무관하게 그리드를 그린다(부분실패 격리). */}
            {activeTab === 'friends' && (
              friendProofs.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {friendProofs.map((proof) => {
                    const friend = acceptedFriends.find((f) => f.userId === proof.userId);
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
              ) : feedUnknown ? (
                // 피드 조회 실패(미지수) — 빈 그리드를 '오늘 미인증'으로 오해하지 않게 소프트 안내.
                <div className="py-10 text-center text-xs text-muted-foreground">
                  친구 인증카드를 불러오지 못했어요
                </div>
              ) : friendsUnknown ? (
                // 친구 조회 실패(미지수) — '친구 없음'(초대 CTA)으로 단정하지 않는 소프트 안내.
                <div className="py-10 text-center text-xs text-muted-foreground">
                  친구 정보를 불러오지 못했어요
                </div>
              ) : acceptedFriends.length === 0 ? (
                <EmptyState variant="no-friends" />
              ) : (
                <div className="py-10 text-center text-xs text-muted-foreground">
                  친구들이 아직 오늘 인증을 안 했어요
                </div>
              )
            )}
          </>
        )}
      </div>
    </>
  );
}

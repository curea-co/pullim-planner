'use client';

import Link from 'next/link';
import { Plus, Eye, EyeOff } from 'lucide-react';
import type { Planner } from '@/lib/mock';
import type { Friend } from '@/lib/mock/studygram';
import { PageHeader } from '@/components/shell/page-header';
import { PlannerCard } from '../components/planner-card';
import { ActivateConfirmDialog } from '../components/activate-confirm-dialog';
import { DeleteConfirmDialog } from '../components/delete-confirm-dialog';
import { SharePlannerDialog } from '../components/share-planner-dialog';
import { EmptyState } from '../components/empty-state';
import { cn } from '@/lib/utils';

interface ManagePlannersPresenterProps {
  tick: number;
  loading?: boolean;
  loadError?: boolean;
  onRetry?: () => void;
  active: Planner | null;
  inactive: Planner[];
  archivedList: Planner[];
  showArchived: boolean;
  activateTarget: Planner | null;
  deleteTarget: Planner | null;
  shareTarget: Planner | null;
  onToggleArchived: () => void;
  onActivateRequest: (id: string) => void;
  onActivateOpenChange: (open: boolean) => void;
  onActivateConfirm: () => void;
  onDuplicate: (id: string) => void;
  onArchive: (id: string) => void;
  onDeleteRequest: (id: string) => void;
  onDeleteOpenChange: (open: boolean) => void;
  onDeleteConfirm: () => void;
  onDecorate: (id: string) => void;
  onShareRequest: (id: string) => void;
  onShareOpenChange: (open: boolean) => void;
  onShareConfirm: (friendIds: string[]) => void;
  /** 공유 모달 친구 목록 — 실 데이터(getFriends)/mock(bypass). */
  friends: Friend[];
  /** 친구 목록 로드 실패 여부. */
  friendsError?: boolean;
}

export default function ManagePlannersPresenter({
  tick,
  loading,
  loadError,
  onRetry,
  active,
  inactive,
  archivedList,
  showArchived,
  activateTarget,
  deleteTarget,
  shareTarget,
  friends,
  friendsError,
  onToggleArchived,
  onActivateRequest,
  onActivateOpenChange,
  onActivateConfirm,
  onDuplicate,
  onArchive,
  onDeleteRequest,
  onDeleteOpenChange,
  onDeleteConfirm,
  onDecorate,
  onShareRequest,
  onShareOpenChange,
  onShareConfirm,
}: ManagePlannersPresenterProps) {
  const totalCount = inactive.length + (active ? 1 : 0);
  const isEmpty = totalCount === 0;

  const cardProps = {
    onActivate: onActivateRequest,
    onDuplicate,
    onArchive,
    onDelete: onDeleteRequest,
    onDecorate,
    onShare: onShareRequest,
  };

  return (
    <div key={tick} className="space-y-5">
      <PageHeader
        title="시간표 관리"
        description={`활성 ${active ? 1 : 0} · 대기 ${inactive.length}${archivedList.length > 0 ? ` · 보관 ${archivedList.length}` : ''}`}
        action={
          <Link
            href="/planner/manage/new"
            className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold text-white shadow-pullim-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
          >
            <Plus className="h-3.5 w-3.5" />
            새 시간표 만들기
          </Link>
        }
      />

      {loading ? (
        // 로딩 스켈레톤 — 첫 렌더에 EmptyState 가 깜빡이는 것 방지 (codex).
        <div
          aria-busy="true"
          aria-label="시간표 불러오는 중"
          className="grid grid-cols-1 gap-4 lg:grid-cols-2"
        >
          {[0, 1].map(i => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-2xl border bg-pullim-slate-100"
            />
          ))}
        </div>
      ) : loadError ? (
        // 불러오기 실패 — "비어 있음"과 구분해 재시도 제공 (codex).
        <div className="bg-card flex flex-col items-center gap-3 rounded-2xl border p-8 text-center">
          <p className="text-pullim-slate-600 text-sm font-semibold">
            시간표를 불러오지 못했어요
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="bg-pullim-blue-600 hover:bg-pullim-blue-700 rounded-lg px-3.5 py-2 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
          >
            다시 시도
          </button>
        </div>
      ) : isEmpty ? (
        <EmptyState />
      ) : (
        <div className="space-y-5">
          <section className={cn('grid grid-cols-1 gap-4', 'lg:grid-cols-2')}>
            {active && <PlannerCard planner={active} {...cardProps} />}
            {inactive.map(p => (
              <PlannerCard key={p.id} planner={p} {...cardProps} />
            ))}
          </section>

          {archivedList.length > 0 && (
            <section>
              <button
                type="button"
                onClick={onToggleArchived}
                aria-expanded={showArchived}
                aria-controls="archived-grid"
                className="text-pullim-slate-600 hover:text-pullim-slate-900 inline-flex items-center gap-1 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 focus-visible:ring-offset-1 rounded"
              >
                {showArchived ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                지난 시간표 {archivedList.length}개 {showArchived ? '숨기기' : '보기'}
              </button>

              {showArchived && (
                <div id="archived-grid" className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
                  {archivedList.map(p => (
                    <PlannerCard key={p.id} planner={p} {...cardProps} />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      <ActivateConfirmDialog
        open={!!activateTarget}
        onOpenChange={onActivateOpenChange}
        current={active}
        target={activateTarget}
        onConfirm={onActivateConfirm}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={onDeleteOpenChange}
        target={deleteTarget}
        onConfirm={onDeleteConfirm}
      />

      <SharePlannerDialog
        open={!!shareTarget}
        onOpenChange={onShareOpenChange}
        planner={shareTarget}
        onConfirm={onShareConfirm}
        friends={friends}
        friendsError={friendsError}
      />
    </div>
  );
}

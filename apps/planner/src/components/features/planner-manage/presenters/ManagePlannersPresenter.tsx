'use client';

import Link from 'next/link';
import { Wrench, Plus, Eye, EyeOff } from 'lucide-react';
import type { Planner } from '@/lib/mock';
import { PageHeader } from '@/components/shell/page-header';
import { PlannerCard } from '../components/planner-card';
import { ActivateConfirmDialog } from '../components/activate-confirm-dialog';
import { DeleteConfirmDialog } from '../components/delete-confirm-dialog';
import { EmptyState } from '../components/empty-state';
import { cn } from '@/lib/utils';

interface ManagePlannersPresenterProps {
  tick: number;
  active: Planner | null;
  inactive: Planner[];
  archivedList: Planner[];
  showArchived: boolean;
  activateTarget: Planner | null;
  deleteTarget: Planner | null;
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
}

export default function ManagePlannersPresenter({
  tick,
  active,
  inactive,
  archivedList,
  showArchived,
  activateTarget,
  deleteTarget,
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
}: ManagePlannersPresenterProps) {
  const totalCount = inactive.length + (active ? 1 : 0);
  const isEmpty = totalCount === 0;

  const cardProps = {
    onActivate: onActivateRequest,
    onDuplicate,
    onArchive,
    onDelete: onDeleteRequest,
    onDecorate,
  };

  return (
    <div key={tick} className="space-y-5">
      <PageHeader
        eyebrow={{ icon: Wrench, text: '시간표 관리' }}
        title="내 시간표"
        description={`활성 1개 + 다른 ${inactive.length}개${archivedList.length > 0 ? ` · 지난 시간표 ${archivedList.length}개 보관` : ''}`}
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

      {isEmpty ? (
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
    </div>
  );
}

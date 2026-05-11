'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Wrench, Plus, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import {
  getPlanners, getActivePlanner, activatePlanner, deletePlanner,
  archivePlanner, duplicatePlanner, findPlanner,
  type Planner,
} from '@/lib/mock';
import { PageHeader } from '@/components/shell/page-header';
import { PlannerCard } from '@/components/planner-manage/planner-card';
import { ActivateConfirmDialog } from '@/components/planner-manage/activate-confirm-dialog';
import { DeleteConfirmDialog } from '@/components/planner-manage/delete-confirm-dialog';
import { EmptyState } from '@/components/planner-manage/empty-state';
import { cn } from '@/lib/utils';

/**
 * 시간표 관리 — N개 플래너 카드 그리드 + CRUD.
 *
 * IA: /planner/manage (Plan 3 본구현).
 * 빌더는 하위 라우트(/manage/new, /manage/[id]/edit)로 종속.
 */
export default function PlannerManagePage() {
  const [showArchived, setShowArchived] = useState(false);
  const [activateTarget, setActivateTarget] = useState<Planner | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Planner | null>(null);
  const [tick, setTick] = useState(0); // 활성 변경·CRUD 후 강제 re-render

  // tick 의존 — useMemo 무효화
  const allPlanners = useMemo(
    () => getPlanners({ includeArchived: true }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick],
  );
  const active = useMemo(
    () => allPlanners.find(p => p.active && !p.archived) ?? null,
    [allPlanners],
  );
  const inactive = allPlanners.filter(p => !p.active && !p.archived);
  const archivedList = allPlanners.filter(p => p.archived);

  function refresh() { setTick(t => t + 1); }

  function onActivateRequest(id: string) {
    const target = findPlanner(id);
    if (!target) return;
    setActivateTarget(target);
  }
  function confirmActivate() {
    if (!activateTarget) return;
    try {
      activatePlanner(activateTarget.id);
      toast.success('✓ 활성 시간표 변경', {
        description: `${activateTarget.name} — 홈 시간표가 갱신됩니다`,
        duration: 3000,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '활성화 실패');
    }
    setActivateTarget(null);
    refresh();
  }

  function onDuplicate(id: string) {
    try {
      const dup = duplicatePlanner(id);
      toast.success('✓ 복사본 만들어짐', { description: dup.name, duration: 2500 });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '복제 실패');
    }
    refresh();
  }

  function onArchive(id: string) {
    const target = findPlanner(id);
    if (!target) return;
    try {
      archivePlanner(id);
      toast(`📦 ${target.name} — 아카이브`, {
        description: '회고용으로 보존됩니다. 지난 시간표 토글로 다시 볼 수 있어요.',
        duration: 3000,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '아카이브 실패');
    }
    refresh();
  }

  function onDeleteRequest(id: string) {
    const target = findPlanner(id);
    if (!target) return;
    if (target.active) {
      toast.error('활성 플래너는 삭제할 수 없어요', {
        description: '다른 플래너를 활성화한 뒤 삭제하세요',
      });
      return;
    }
    setDeleteTarget(target);
  }
  function confirmDelete() {
    if (!deleteTarget) return;
    try {
      deletePlanner(deleteTarget.id);
      toast(`🗑 ${deleteTarget.name} — 삭제됨`, { duration: 2500 });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '삭제 실패');
    }
    setDeleteTarget(null);
    refresh();
  }

  const totalCount = inactive.length + (active ? 1 : 0);
  const isEmpty = totalCount === 0;

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
          {/* 활성 + 비활성 카드들 */}
          <section
            className={cn(
              'grid grid-cols-1 gap-4',
              'lg:grid-cols-2',
            )}
          >
            {active && (
              <PlannerCard
                planner={active}
                onActivate={onActivateRequest}
                onDuplicate={onDuplicate}
                onArchive={onArchive}
                onDelete={onDeleteRequest}
              />
            )}
            {inactive.map(p => (
              <PlannerCard
                key={p.id}
                planner={p}
                onActivate={onActivateRequest}
                onDuplicate={onDuplicate}
                onArchive={onArchive}
                onDelete={onDeleteRequest}
              />
            ))}
          </section>

          {/* 아카이브 토글 */}
          {archivedList.length > 0 && (
            <section>
              <button
                type="button"
                onClick={() => setShowArchived(s => !s)}
                aria-expanded={showArchived}
                aria-controls="archived-grid"
                className="text-pullim-slate-600 hover:text-pullim-slate-900 inline-flex items-center gap-1 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 focus-visible:ring-offset-1 rounded"
              >
                {showArchived ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                지난 시간표 {archivedList.length}개 {showArchived ? '숨기기' : '보기'}
              </button>

              {showArchived && (
                <div
                  id="archived-grid"
                  className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2"
                >
                  {archivedList.map(p => (
                    <PlannerCard
                      key={p.id}
                      planner={p}
                      onActivate={onActivateRequest}
                      onDuplicate={onDuplicate}
                      onArchive={onArchive}
                      onDelete={onDeleteRequest}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      <ActivateConfirmDialog
        open={!!activateTarget}
        onOpenChange={(o) => { if (!o) setActivateTarget(null); }}
        current={active}
        target={activateTarget}
        onConfirm={confirmActivate}
      />

      <DeleteConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        target={deleteTarget}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  getPlanners, activatePlanner, deletePlanner,
  archivePlanner, duplicatePlanner, findPlanner,
  type Planner,
} from '@/lib/mock';
import ManagePlannersPresenter from '../presenters/ManagePlannersPresenter';

/**
 * 시간표 관리 Container — N개 플래너 카드 그리드 + CRUD.
 *
 * tick 패턴: getPlanners()가 mock 모듈 내부 상태를 반환하는 외부 store 성격이라,
 * mutation(activate/delete/archive/duplicate) 후 React에 명시적 "다시 읽어라" 신호로 사용.
 * Phase η(api-client 전환)에서 react-query 캐시 무효화로 자연 대체됨.
 */
export default function ManagePlannersContainer() {
  const router = useRouter();
  const [showArchived, setShowArchived] = useState(false);
  const [activateTarget, setActivateTarget] = useState<Planner | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Planner | null>(null);
  const [tick, setTick] = useState(0);

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

  /** 꾸미기 — 빌더 편집 페이지 layout 탭으로 점프 */
  function onDecorate(id: string) {
    router.push(`/planner/manage/${id}/edit?tab=layout`);
  }

  return (
    <ManagePlannersPresenter
      tick={tick}
      active={active}
      inactive={inactive}
      archivedList={archivedList}
      showArchived={showArchived}
      activateTarget={activateTarget}
      deleteTarget={deleteTarget}
      onToggleArchived={() => setShowArchived(s => !s)}
      onActivateRequest={onActivateRequest}
      onActivateOpenChange={(o) => { if (!o) setActivateTarget(null); }}
      onActivateConfirm={confirmActivate}
      onDuplicate={onDuplicate}
      onArchive={onArchive}
      onDeleteRequest={onDeleteRequest}
      onDeleteOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
      onDeleteConfirm={confirmDelete}
      onDecorate={onDecorate}
    />
  );
}

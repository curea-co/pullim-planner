'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ApiError } from '@pullim-planner/api-client';
import type { Planner } from '@/lib/mock';
import { getPlanners } from '@/lib/mock/planner';
import { apiToPlanner, plannerClient } from '@/lib/planner/client';
import ManagePlannersPresenter from '../presenters/ManagePlannersPresenter';

const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1';

/**
 * 시간표 관리 Container — N개 플래너 카드 그리드 + CRUD.
 *
 * 실 BE planner API(per-user) 연동: 마운트 시 list() 로드, mutation 후 다시 list() 로
 * 갱신한다 (tick 대신 명시 refetch). 모든 호출은 authClient.withAuth 로 인증된다.
 */
export default function ManagePlannersContainer() {
  const router = useRouter();
  const [showArchived, setShowArchived] = useState(false);
  const [activateTarget, setActivateTarget] = useState<Planner | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Planner | null>(null);
  const [allPlanners, setAllPlanners] = useState<Planner[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tick, setTick] = useState(0);

  // 마운트 + tick(mutation 후 refresh) 마다 본인 시간표 목록을 다시 읽는다.
  // loading/loadError 를 분리해 "정말 비어 있음"과 "불러오기 실패"를 구분한다 (codex).
  useEffect(() => {
    // 로컬 dev 우회 — pullim-api CORS/쿠키 미지원 환경에서 mock 데이터 사용.
    if (DEV_AUTH_BYPASS) {
      setAllPlanners(getPlanners({ includeArchived: true }));
      setLoadError(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const list = await plannerClient.list();
        if (!cancelled) {
          setAllPlanners(list.map(apiToPlanner));
          setLoadError(false);
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(true);
          toast.error(
            e instanceof ApiError ? e.message : '시간표를 불러오지 못했어요',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tick]);

  const active = useMemo(
    () => allPlanners.find((p) => p.active && !p.archived) ?? null,
    [allPlanners],
  );
  const inactive = allPlanners.filter((p) => !p.active && !p.archived);
  const archivedList = allPlanners.filter((p) => p.archived);

  function refresh() {
    setTick((t) => t + 1);
  }

  function onActivateRequest(id: string) {
    const target = allPlanners.find((p) => p.id === id);
    if (!target) return;
    setActivateTarget(target);
  }
  async function confirmActivate() {
    if (!activateTarget) return;
    try {
      await plannerClient.activate(activateTarget.id);
      toast.success('✓ 활성 시간표 변경', {
        description: `${activateTarget.name} — 홈 시간표가 갱신됩니다`,
        duration: 3000,
      });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '활성화 실패');
    }
    setActivateTarget(null);
    refresh();
  }

  async function onDuplicate(id: string) {
    try {
      const dup = await plannerClient.duplicate(id);
      toast.success('✓ 복사본 만들어짐', {
        description: dup.name,
        duration: 2500,
      });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '복제 실패');
    }
    refresh();
  }

  async function onArchive(id: string) {
    const target = allPlanners.find((p) => p.id === id);
    if (!target) return;
    try {
      await plannerClient.archive(id);
      toast(`📦 ${target.name} — 아카이브`, {
        description:
          '회고용으로 보존됩니다. 지난 시간표 토글로 다시 볼 수 있어요.',
        duration: 3000,
      });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '아카이브 실패');
    }
    refresh();
  }

  function onDeleteRequest(id: string) {
    const target = allPlanners.find((p) => p.id === id);
    if (!target) return;
    if (target.active) {
      toast.error('활성 플래너는 삭제할 수 없어요', {
        description: '다른 플래너를 활성화한 뒤 삭제하세요',
      });
      return;
    }
    setDeleteTarget(target);
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await plannerClient.remove(deleteTarget.id);
      toast(`🗑 ${deleteTarget.name} — 삭제됨`, { duration: 2500 });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '삭제 실패');
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
      loading={loading}
      loadError={loadError}
      onRetry={refresh}
      active={active}
      inactive={inactive}
      archivedList={archivedList}
      showArchived={showArchived}
      activateTarget={activateTarget}
      deleteTarget={deleteTarget}
      onToggleArchived={() => setShowArchived((s) => !s)}
      onActivateRequest={onActivateRequest}
      onActivateOpenChange={(o) => {
        if (!o) setActivateTarget(null);
      }}
      onActivateConfirm={confirmActivate}
      onDuplicate={onDuplicate}
      onArchive={onArchive}
      onDeleteRequest={onDeleteRequest}
      onDeleteOpenChange={(o) => {
        if (!o) setDeleteTarget(null);
      }}
      onDeleteConfirm={confirmDelete}
      onDecorate={onDecorate}
    />
  );
}

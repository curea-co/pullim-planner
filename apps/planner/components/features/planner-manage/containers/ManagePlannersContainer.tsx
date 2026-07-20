'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ApiError } from '@pullim-planner/api-client';
import type { Planner } from '@/lib/mock';
import {
  getPlanners,
  activatePlanner,
  duplicatePlanner,
  archivePlanner,
  deletePlanner,
} from '@/lib/mock/planner';
import { apiToPlanner, plannerClient } from '@/lib/planner/client';
import { pullimPlannerClient, pullimToFriend } from '@/lib/planner/pullim-client';
import { mockFriends } from '@/lib/mock/studygram';
import type { Friend } from '@/lib/mock/studygram';
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
  const [shareTarget, setShareTarget] = useState<Planner | null>(null);
  const [allPlanners, setAllPlanners] = useState<Planner[]>([]);
  // 공유 모달용 친구 목록 — LNB '공유'와 동일한 실 데이터(getFriends). dev bypass면 mock.
  const [friends, setFriends] = useState<Friend[]>(DEV_AUTH_BYPASS ? mockFriends : []);
  const [friendsError, setFriendsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tick, setTick] = useState(0);

  // 공유 모달 친구 목록 — 마운트 1회(real 모드). 실패해도 시간표 관리 자체는 동작해야 하므로
  // 조용히 빈 목록 유지(공유 모달에서 "친구 없음"으로 처리). LNB '공유'와 동일한 getFriends 재사용.
  useEffect(() => {
    if (DEV_AUTH_BYPASS) return;
    let cancelled = false;
    void (async () => {
      try {
        const rows = await pullimPlannerClient.getFriends();
        if (!cancelled) {
          setFriends(rows.map(pullimToFriend));
          setFriendsError(false);
        }
      } catch {
        // 로드 실패(네트워크·401 등) — 빈 목록을 '친구 없음'으로 오표시하지 않게 실패 플래그를
        // 세운다(LNB '공유' ShareContainer 동일 패턴). 관리 화면 자체는 정상 동작.
        if (!cancelled) setFriendsError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // 마운트 + tick(mutation 후 refresh) 마다 본인 시간표 목록을 다시 읽는다.
  // loading/loadError 를 분리해 "정말 비어 있음"과 "불러오기 실패"를 구분한다 (codex).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // 로컬 dev 우회 — pullim-api CORS/쿠키 미지원 환경에서 mock 데이터 사용.
      // (동기 setState 가 아닌 async 콜백 내부에서 처리해 set-state-in-effect 룰 충족.)
      if (DEV_AUTH_BYPASS) {
        if (!cancelled) {
          setAllPlanners(getPlanners({ includeArchived: true }));
          setLoadError(false);
          setLoading(false);
        }
        return;
      }
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
    // dev 우회 — 실 API 대신 공유 mock store(lib/mock/planner)를 변경한다. 홈/헤더가 읽는
    // getActivePlanner()/getPlanners() 와 동일 store 라 화면을 벗어나도 일관되며, refresh 로 되읽는다.
    if (DEV_AUTH_BYPASS) {
      activatePlanner(activateTarget.id);
      toast.success('✓ 활성 시간표 변경', {
        description: `${activateTarget.name} — 홈 시간표가 갱신됩니다`,
        duration: 3000,
      });
      setActivateTarget(null);
      refresh();
      return;
    }
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
    if (DEV_AUTH_BYPASS) {
      const dup = duplicatePlanner(id);
      toast.success('✓ 복사본 만들어짐', { description: dup.name, duration: 2500 });
      refresh();
      return;
    }
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
    if (DEV_AUTH_BYPASS) {
      archivePlanner(id);
      toast(`📦 ${target.name} — 아카이브`, {
        description: '회고용으로 보존됩니다. 지난 시간표 토글로 다시 볼 수 있어요.',
        duration: 3000,
      });
      refresh();
      return;
    }
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
    if (DEV_AUTH_BYPASS) {
      deletePlanner(deleteTarget.id);
      toast(`🗑 ${deleteTarget.name} — 삭제됨`, { duration: 2500 });
      setDeleteTarget(null);
      refresh();
      return;
    }
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

  /** 공유 — 친구 선택 모달 열기 (아웃바운드. 인바운드 조회는 LNB "공유") */
  function onShareRequest(id: string) {
    const target = allPlanners.find((p) => p.id === id);
    if (target) setShareTarget(target);
  }
  /**
   * 공유 확정 — studygram 공유 BE·인바운드 조회 화면이 모두 미구현(spec P1+).
   * 실환경에서 성공처럼 보이면 안 되므로, **DEV 우회에서만 mock 성공**을 띄우고
   * 그 외에는 "준비 중" 안내로 정직하게 처리한다 (codex).
   */
  function confirmShare(friendIds: string[]) {
    if (!shareTarget) return;
    if (DEV_AUTH_BYPASS) {
      const names = friends
        .filter((f) => friendIds.includes(f.id))
        .map((f) => f.name)
        .join(', ');
      toast.success(`📨 ${shareTarget.name} 공유 (미리보기)`, {
        description: `${names}님에게 공유 — 실제 전송·조회는 준비 중`,
        duration: 3000,
      });
    } else {
      toast.info('친구 공유는 준비 중이에요', {
        description: '시간표를 친구에게 전달하는 기능을 순차 제공할게요',
        duration: 3000,
      });
    }
    setShareTarget(null);
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
      shareTarget={shareTarget}
      onShareRequest={onShareRequest}
      onShareOpenChange={(o) => {
        if (!o) setShareTarget(null);
      }}
      onShareConfirm={confirmShare}
      friends={friends}
      friendsError={friendsError}
    />
  );
}

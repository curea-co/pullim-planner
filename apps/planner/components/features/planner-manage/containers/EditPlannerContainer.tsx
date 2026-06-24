'use client';

import { useEffect, useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { ApiError } from '@pullim-planner/api-client';
import {
  plannerToForm, formToPlannerPatch,
  type PlannerForm,
} from '@/components/features/planner-builder/components/builder-types';
import type { Planner } from '@/lib/mock';
import { findPlanner, updatePlanner } from '@/lib/mock/planner';
import { apiToPlanner, plannerClient, toWriteInput } from '@/lib/planner/client';
import { usePlannerForm } from '../hooks/use-planner-form';
import EditPlannerPresenter from '../presenters/EditPlannerPresenter';

export type EditTab = 'config' | 'layout';

const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1';

/**
 * 기존 시간표 수정 Container — 빌더 with pre-fill (mode='edit').
 *
 * 실 BE planner API(per-user) 연동: list() 로 본인 시간표를 받아 id 로 찾는다
 * (단건 GET 엔드포인트 미존재). 데이터 준비 후 빌더 폼을 마운트한다 (usePlannerForm 이
 * 초기 폼을 마운트 시점에 한 번 잡으므로 inner 컴포넌트로 분리해 hooks 규칙을 지킨다).
 *
 * Next 16: dynamic params 는 Promise. `use()` hook 으로 unwrap.
 */
export default function EditPlannerContainer({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [planner, setPlanner] = useState<Planner | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!cancelled) setLoaded(false);
      // 로컬 dev 우회 — 실 API 대신 공유 mock store에서 단건을 찾는다 (ManagePlannersContainer 정합).
      if (DEV_AUTH_BYPASS) {
        if (!cancelled) {
          setPlanner(findPlanner(id) ?? null);
          setLoadError(false);
          setLoaded(true);
        }
        return;
      }
      try {
        const list = await plannerClient.list();
        const found =
          list.map(apiToPlanner).find((p) => p.id === id) ?? null;
        if (!cancelled) {
          setPlanner(found);
          setLoadError(false);
        }
      } catch (e) {
        // fetch 실패와 not-found(planner=null)를 구분한다 — 합치면 인증 만료/일시 장애에도
        // 사용자가 "시간표가 삭제됐다"고 오해한다 (codex).
        if (!cancelled) {
          setLoadError(true);
          toast.error(
            e instanceof ApiError ? e.message : '시간표를 불러오지 못했어요',
          );
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, tick]);

  // 로딩 중에는 빌더를 마운트하지 않는다 (폼 초기값을 데이터 준비 후 한 번에 잡기 위함).
  if (!loaded) return null;
  // 불러오기 실패 — not-found 와 구분해 재시도 제공.
  if (loadError) {
    return (
      <div className="bg-card flex flex-col items-center gap-3 rounded-2xl border p-8 text-center">
        <p className="text-pullim-slate-600 text-sm font-semibold">
          시간표를 불러오지 못했어요
        </p>
        <button
          type="button"
          onClick={() => setTick(t => t + 1)}
          className="bg-pullim-blue-600 hover:bg-pullim-blue-700 rounded-lg px-3.5 py-2 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500"
        >
          다시 시도
        </button>
      </div>
    );
  }
  return <EditPlannerForm id={id} planner={planner} />;
}

/** 데이터 준비 후 마운트되는 빌더 폼 — usePlannerForm 초기화를 로드된 planner 로 한다. */
function EditPlannerForm({
  id,
  planner,
}: {
  id: string;
  planner: Planner | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab: EditTab =
    searchParams.get('tab') === 'layout' ? 'layout' : 'config';
  const [tab, setTab] = useState<EditTab>(initialTab);

  const formState = usePlannerForm(
    planner ? plannerToForm(planner) : ({} as PlannerForm),
    planner?.name ?? '시간표',
  );

  async function handleSave(submitted: PlannerForm) {
    // 로컬 dev 우회 — 실 API 대신 공유 mock store를 갱신한다.
    if (DEV_AUTH_BYPASS) {
      updatePlanner(id, formToPlannerPatch(submitted));
      toast.success('✓ 변경 사항 저장 완료', {
        description: `${submitted.examName} — 다음 활성화 시 반영됩니다`,
        duration: 3000,
      });
      router.push('/planner/manage');
      return;
    }
    try {
      // customization 은 PUT /planners 가 갱신하지 않는다(전용 엔드포인트 소유, BE 보존).
      // 따라서 폼 결과를 그대로 보낸다 — 굳이 customization 을 실으면 꾸미기 탭에서 방금 저장한
      // 값과 stale 충돌만 생긴다 (codex R4). toWriteInput 결과에 customization 이 있어도 BE 무시.
      await plannerClient.update(id, toWriteInput(formToPlannerPatch(submitted)));
      toast.success('✓ 변경 사항 저장 완료', {
        description: `${submitted.examName} — 다음 활성화 시 반영됩니다`,
        duration: 3000,
      });
      router.push('/planner/manage');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '저장 실패');
    }
  }

  return (
    <EditPlannerPresenter
      planner={planner ?? null}
      tab={tab}
      onTabChange={setTab}
      form={formState.form}
      setForm={formState.setForm}
      currentStep={formState.currentStep}
      canPrev={formState.canPrev}
      canNext={formState.canNext}
      onPrev={formState.goPrev}
      onNext={formState.goNext}
      onJump={formState.jumpTo}
      onSaveDraft={formState.saveDraft}
      onSave={handleSave}
    />
  );
}

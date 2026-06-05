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
import { apiToPlanner, plannerClient, toWriteInput } from '@/lib/planner/client';
import { usePlannerForm } from '../hooks/use-planner-form';
import EditPlannerPresenter from '../presenters/EditPlannerPresenter';

export type EditTab = 'config' | 'layout';

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

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await plannerClient.list();
        const found =
          list.map(apiToPlanner).find((p) => p.id === id) ?? null;
        if (!cancelled) setPlanner(found);
      } catch (e) {
        if (!cancelled) {
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
  }, [id]);

  // 로딩 중에는 빌더를 마운트하지 않는다 (폼 초기값을 데이터 준비 후 한 번에 잡기 위함).
  if (!loaded) return null;
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
    try {
      await plannerClient.update(
        id,
        toWriteInput(formToPlannerPatch(submitted)),
      );
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

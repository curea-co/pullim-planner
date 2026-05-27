'use client';

import { useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  plannerToForm, formToPlannerPatch,
  type PlannerForm,
} from '@/components/planner-builder/builder-types';
import { findPlanner, updatePlanner } from '@/lib/mock';
import { usePlannerForm } from '../hooks/use-planner-form';
import EditPlannerPresenter from '../presenters/EditPlannerPresenter';

export type EditTab = 'config' | 'layout';

/**
 * 기존 시간표 수정 Container — 빌더 with pre-fill (mode='edit').
 *
 * Next 16: dynamic params는 Promise. `use()` hook으로 unwrap.
 */
export default function EditPlannerContainer({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { id } = use(params);
  const planner = findPlanner(id);

  const initialTab: EditTab = searchParams.get('tab') === 'layout' ? 'layout' : 'config';
  const [tab, setTab] = useState<EditTab>(initialTab);

  // planner 못 찾아도 hook 호출은 unconditional — empty form fallback
  const formState = usePlannerForm(
    planner ? plannerToForm(planner) : ({} as PlannerForm),
    planner?.name ?? '시간표',
  );

  function handleSave(submitted: PlannerForm) {
    updatePlanner(id, formToPlannerPatch(submitted));
    toast.success('✓ 변경 사항 저장 완료', {
      description: `${submitted.examName} — 다음 활성화 시 반영됩니다`,
      duration: 3000,
    });
    router.push('/planner/manage');
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

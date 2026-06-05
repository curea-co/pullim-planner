'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ApiError } from '@pullim-planner/api-client';
import {
  initialPlannerForm, formToPlannerPatch,
  type PlannerForm,
} from '@/components/features/planner-builder/components/builder-types';
import { plannerClient, toWriteInput } from '@/lib/planner/client';
import { usePlannerForm } from '../hooks/use-planner-form';
import NewPlannerPresenter from '../presenters/NewPlannerPresenter';

export default function NewPlannerContainer() {
  const router = useRouter();
  const formState = usePlannerForm(initialPlannerForm, '새 플래너');

  async function handleActivate(submitted: PlannerForm) {
    try {
      const planner = await plannerClient.create(
        toWriteInput(formToPlannerPatch(submitted)),
      );
      await plannerClient.activate(planner.id);
      toast.success('🎯 새 시간표 활성화 완료', {
        description: `${planner.name} — 홈 시간표가 생성됐어요`,
        duration: 3000,
      });
      router.push('/planner/manage');
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '시간표 생성 실패');
    }
  }

  return (
    <NewPlannerPresenter
      form={formState.form}
      setForm={formState.setForm}
      currentStep={formState.currentStep}
      canPrev={formState.canPrev}
      canNext={formState.canNext}
      onPrev={formState.goPrev}
      onNext={formState.goNext}
      onJump={formState.jumpTo}
      onSaveDraft={formState.saveDraft}
      onActivate={handleActivate}
    />
  );
}

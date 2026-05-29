'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  initialPlannerForm, formToPlannerPatch,
  type PlannerForm,
} from '@/components/features/planner-builder/components/builder-types';
import { createPlanner, activatePlanner } from '@/lib/mock';
import { usePlannerForm } from '../hooks/use-planner-form';
import NewPlannerPresenter from '../presenters/NewPlannerPresenter';

export default function NewPlannerContainer() {
  const router = useRouter();
  const formState = usePlannerForm(initialPlannerForm, '새 플래너');

  function handleActivate(submitted: PlannerForm) {
    const planner = createPlanner(formToPlannerPatch(submitted));
    activatePlanner(planner.id);
    toast.success('🎯 새 시간표 활성화 완료', {
      description: `${planner.name} — 홈 시간표가 생성됐어요`,
      duration: 3000,
    });
    router.push('/planner/manage');
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

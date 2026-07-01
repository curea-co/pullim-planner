'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ApiError } from '@pullim-planner/api-client';
import {
  initialPlannerForm, formToPlannerPatch,
  type PlannerForm,
} from '@/components/features/planner-builder/components/builder-types';
import { createPlanner, activatePlanner } from '@/lib/mock/planner';
import { plannerClient, toWriteInput } from '@/lib/planner/client';
import { usePlannerForm } from '../hooks/use-planner-form';
import NewPlannerPresenter from '../presenters/NewPlannerPresenter';

const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1';

export default function NewPlannerContainer() {
  const router = useRouter();
  const formState = usePlannerForm(initialPlannerForm, '새 플래너');

  async function handleActivate(submitted: PlannerForm) {
    // 로컬 dev 우회 — pullim-api CORS/쿠키 미지원 환경에서 실 API 대신 공유 mock store에
    // 생성·활성화한다. ManagePlannersContainer 의 confirmActivate 와 동일 store(lib/mock/planner)라
    // 관리/홈 화면과 일관되며, 위저드를 끝까지 검증할 수 있다.
    if (DEV_AUTH_BYPASS) {
      const planner = createPlanner(formToPlannerPatch(submitted));
      activatePlanner(planner.id);
      toast.success('🎯 새 시간표 활성화 완료', {
        description: `${planner.name} — 홈 시간표가 생성됐어요`,
        duration: 3000,
      });
      router.push('/planner/manage');
      return;
    }
    // create 와 activate 를 분리해 부분 성공을 구분한다 — 한 catch 로 뭉치면 create 성공 후
    // activate 만 실패해도 "생성 실패"로 보여 사용자가 재시도 → 동일 플래너가 중복 생성된다 (codex).
    let planner;
    try {
      planner = await plannerClient.create(
        toWriteInput(formToPlannerPatch(submitted)),
      );
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : '시간표 생성 실패');
      return;
    }
    try {
      await plannerClient.activate(planner.id);
      toast.success('🎯 새 시간표 활성화 완료', {
        description: `${planner.name} — 홈 시간표가 생성됐어요`,
        duration: 3000,
      });
    } catch {
      // 생성은 성공 — 재시도로 중복 생성되지 않게 안내만 하고 관리 화면으로 보낸다.
      toast.warning('시간표는 생성됐지만 활성화에 실패했어요', {
        description: `${planner.name} — 관리 화면에서 활성화해 주세요`,
        duration: 4000,
      });
    }
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

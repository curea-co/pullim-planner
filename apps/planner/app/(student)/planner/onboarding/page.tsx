import { Suspense } from 'react';
import OnboardingContainer from '@/components/features/planner-onboarding/containers/OnboardingContainer';

export default function PlannerOnboardingPage() {
  return (
    <Suspense fallback={<div className="text-pullim-slate-400 py-10 text-center text-sm">온보딩 불러오는 중…</div>}>
      <OnboardingContainer />
    </Suspense>
  );
}

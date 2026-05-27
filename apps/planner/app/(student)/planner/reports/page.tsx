import { Suspense } from 'react';
import ReportsContainer from '@/components/features/planner-reports/containers/ReportsContainer';

export default function PlannerReportsPage() {
  return (
    <Suspense fallback={<div className="text-pullim-slate-400 py-10 text-center text-sm">리포트 불러오는 중…</div>}>
      <ReportsContainer />
    </Suspense>
  );
}

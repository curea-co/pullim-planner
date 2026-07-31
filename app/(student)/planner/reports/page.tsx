import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { REPORTS_ENABLED } from '@/lib/flags';
import ReportsContainer from '@/components/features/planner-reports/containers/ReportsContainer';

export default function PlannerReportsPage() {
  if (!REPORTS_ENABLED) redirect('/planner'); // soft open 게이트 (mock 미노출 — 온보딩 "출시 예정" 카드로만 예고)
  return (
    <Suspense fallback={<div className="text-pullim-slate-400 py-10 text-center text-sm">리포트 불러오는 중…</div>}>
      <ReportsContainer />
    </Suspense>
  );
}

'use client';

import { Suspense, useCallback, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Send } from 'lucide-react';
import {
  ReportsShell, type ReportsView,
} from '@/components/planner/reports/reports-shell';
import { WeeklySummary } from '@/components/planner/reports/weekly-summary';
import { MonthlySummary } from '@/components/planner/reports/monthly-summary';
import { ConsentDialog } from '@/components/planner/reports/consent-dialog';
import { TodayReflection } from '@/components/planner/today-reflection';
import { currentPersona, getDday } from '@/lib/mock';

const VALID_VIEWS: ReportsView[] = ['day', 'week', 'month'];

const descriptionByView: Record<ReportsView, (dday: number, examLabel: string) => React.ReactNode> = {
  day:   (dday, examLabel) => <>오늘 학습 결과를 한 화면에서 — {examLabel} · D-{dday}</>,
  week:  (_, examLabel) => <>이번 주 학습 시간·정답률·약점 진도 종합 — {examLabel}</>,
  month: (dday, examLabel) => <>{examLabel}까지 D-{dday} · 큰 그림과 마일스톤 점검</>,
};

function PlannerReports() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get('view');
  const view: ReportsView = (VALID_VIEWS as string[]).includes(raw ?? '')
    ? (raw as ReportsView)
    : 'week';

  const [consentOpen, setConsentOpen] = useState(false);

  const onChangeView = useCallback(
    (next: ReportsView) => {
      const qs = next === 'week' ? '' : `?view=${next}`;
      router.replace(`/planner/reports${qs}`, { scroll: false });
    },
    [router],
  );

  const dday = getDday(currentPersona);

  return (
    <>
      <ReportsShell
        view={view}
        onChangeView={onChangeView}
        description={descriptionByView[view](dday, currentPersona.examLabel)}
        action={
          <button
            type="button"
            onClick={() => setConsentOpen(true)}
            className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold text-white shadow-pullim-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 focus-visible:ring-offset-1"
          >
            <Send className="h-3.5 w-3.5" />
            부모님께 보내기
          </button>
        }
      >
        {view === 'day' && <TodayReflection />}
        {view === 'week' && <WeeklySummary />}
        {view === 'month' && <MonthlySummary />}
      </ReportsShell>

      <ConsentDialog open={consentOpen} onOpenChange={setConsentOpen} />
    </>
  );
}

export default function PlannerReportsPage() {
  return (
    <Suspense fallback={<div className="text-pullim-slate-400 py-10 text-center text-sm">리포트 불러오는 중…</div>}>
      <PlannerReports />
    </Suspense>
  );
}

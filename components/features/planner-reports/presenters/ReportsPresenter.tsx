'use client';

import { Send } from 'lucide-react';
import {
  ReportsShell,
  type ReportsView,
} from '../components/reports-shell';
import { WeeklySummary } from '../components/weekly-summary';
import { MonthlySummary } from '../components/monthly-summary';
import { ConsentDialog } from '../components/consent-dialog';
import { TodayReflection } from '@/components/features/planner-home/components/today-reflection';
import { REFLECTION_ENABLED } from '@/lib/flags';

interface ReportsPresenterProps {
  view: ReportsView;
  dday: number;
  examLabel: string;
  consentOpen: boolean;
  onChangeView: (next: ReportsView) => void;
  onConsentOpenChange: (open: boolean) => void;
  onParentShareClick: () => void;
}

const descriptionByView: Record<
  ReportsView,
  (dday: number, examLabel: string) => React.ReactNode
> = {
  day:   (dday, examLabel) => <>오늘 학습 결과를 한 화면에서 — {examLabel} · D-{dday}</>,
  week:  (_, examLabel) => <>이번 주 학습 시간·정답률·약점 진도 종합 — {examLabel}</>,
  month: (dday, examLabel) => <>{examLabel}까지 D-{dday} · 큰 그림과 마일스톤 점검</>,
};

export default function ReportsPresenter({
  view,
  dday,
  examLabel,
  consentOpen,
  onChangeView,
  onConsentOpenChange,
  onParentShareClick,
}: ReportsPresenterProps) {
  return (
    <>
      <ReportsShell
        view={view}
        onChangeView={onChangeView}
        description={descriptionByView[view](dday, examLabel)}
        action={
          <button
            type="button"
            onClick={onParentShareClick}
            className="bg-pullim-blue-600 hover:bg-pullim-blue-700 inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold text-white shadow-pullim-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 focus-visible:ring-offset-1"
          >
            <Send className="h-3.5 w-3.5" />
            부모님께 회고 공유
          </button>
        }
      >
        {/* REFLECTION_ENABLED로 홈과 동일하게 게이트 — REPORTS_ENABLED만 독립적으로 켜져도
            mock 회고(dailyReflection())가 새는 것 방지(Codex #145). */}
        {view === 'day' && (
          REFLECTION_ENABLED
            ? <TodayReflection defaultOpen />
            : <div className="py-16 text-center text-xs text-muted-foreground">일간 회고는 곧 열려요</div>
        )}
        {view === 'week' && <WeeklySummary />}
        {view === 'month' && <MonthlySummary />}
      </ReportsShell>

      <ConsentDialog open={consentOpen} onOpenChange={onConsentOpenChange} />
    </>
  );
}

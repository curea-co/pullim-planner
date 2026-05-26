'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { CalendarShell, type CalendarView } from '../components/calendar-shell';
import { DayView } from '../components/views/day-view';
import { WeekView } from '../components/views/week-view';
import { MonthView } from '../components/views/month-view';
import { composeDDayChipProps } from '@/lib/planner/d-day-tier';
import { DDayChip } from '@/components/shared/d-day-chip';
import { DDayHeaderBand } from '../components/d-day-header-band';
import { BurnoutThresholdBanner } from '../components/burnout-threshold-banner';

interface HomePresenterProps {
  view: CalendarView;
  examName: string;
  dday: number;
  burnoutScore: number;
  daySummary: { done: number; total: number };
  weekMeta: { totalHours: number; completedHours: number };
  monthMeta: { totalBlocks: number };
  onChangeView: (next: CalendarView) => void;
}

export default function HomePresenter({
  view,
  examName,
  dday,
  burnoutScore,
  daySummary,
  weekMeta,
  monthMeta,
  onChangeView,
}: HomePresenterProps) {
  const switchAction = (
    <Link
      href="/planner/manage"
      className="text-pullim-blue-600 hover:bg-pullim-blue-50 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 focus-visible:ring-offset-1"
    >
      다른 시간표로 전환
      <ArrowRight className="h-3 w-3" />
    </Link>
  );

  const headerProps = (() => {
    if (view === 'day') {
      return {
        title: '오늘의 학습 — 4월 24일 목요일',
        description: (
          <>
            <strong className="text-pullim-blue-700">{examName}</strong>
            <span className="mx-1">·</span>
            <DDayChip {...composeDDayChipProps(dday, examName)} />
            <span className="mx-1">·</span>
            {daySummary.done}/{daySummary.total} 블록 완료
          </>
        ),
        navLabel: '2026.04.24 (목)',
        prevLabel: undefined,
        nextLabel: undefined,
      };
    }
    if (view === 'week') {
      return {
        title: '4월 21일 — 27일',
        description: (
          <>
            <strong className="text-pullim-blue-700">{examName}</strong>
            <span className="mx-1">·</span>
            이번 주 계획 <span className="font-mono text-pullim-slate-700 font-bold">{weekMeta.totalHours}h</span>
            <span className="mx-1">·</span>
            완료 <span className="font-mono text-pullim-success font-bold">{weekMeta.completedHours}h</span>
          </>
        ),
        navLabel: '2026.04 · 4주차',
        prevLabel: '지난 주',
        nextLabel: '다음 주',
      };
    }
    return {
      title: '2026년 4월',
      description: (
        <>
          <strong className="text-pullim-blue-700">{examName}</strong>까지 <DDayChip {...composeDDayChipProps(dday, examName)} />
          <span className="mx-1">·</span>
          이번 달 학습 블록 <span className="font-mono font-bold">{monthMeta.totalBlocks}개</span>
        </>
      ),
      navLabel: '2026.04',
      prevLabel: '3월',
      nextLabel: '5월',
    };
  })();

  return (
    <>
      <DDayHeaderBand dday={dday} examName={examName} />
      <BurnoutThresholdBanner score={burnoutScore} />
      <CalendarShell
        view={view}
        onChangeView={onChangeView}
        title={headerProps.title}
        description={headerProps.description}
        navLabel={headerProps.navLabel}
        prevLabel={headerProps.prevLabel}
        nextLabel={headerProps.nextLabel}
        action={switchAction}
      >
        {view === 'day' && <DayView />}
        {view === 'week' && <WeekView />}
        {view === 'month' && <MonthView />}
      </CalendarShell>
    </>
  );
}

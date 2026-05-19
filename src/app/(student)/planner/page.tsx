'use client';

import { Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import { CalendarShell, type CalendarView } from '@/components/planner/calendar-shell';
import { DayView } from '@/components/planner/views/day-view';
import { WeekView, getWeekMeta } from '@/components/planner/views/week-view';
import { MonthView, getMonthMeta } from '@/components/planner/views/month-view';
import { DDayChip } from '@/components/planner/d-day-chip';
import { DDayHeaderBand } from '@/components/planner/d-day-header-band';
import { BurnoutThresholdBanner } from '@/components/planner/burnout-threshold-banner';
import {
  currentPersona, getDday, plannerProgress, getActivePlanner,
  todayBurnout,
} from '@/lib/mock';

const VALID_VIEWS: CalendarView[] = ['day', 'week', 'month'];

/**
 * 풀림 플래너 홈 — 활성 플래너의 시간표 (일/주/월 토글).
 *
 * Plan 4: 기존 `/planner/calendar`를 홈으로 흡수.
 *   - 다중 플래너 시대 — 헤더에 활성 플래너명 + "다른 시간표로 전환" 링크
 *   - 결정 표면(NEXT BLOCK·컨디션·번아웃)은 day-view에 이미 있어 그대로 활용
 *   - /planner/calendar 진입은 redirect로 호환
 */
function PlannerHome() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get('view');
  const view: CalendarView = (VALID_VIEWS as string[]).includes(raw ?? '')
    ? (raw as CalendarView)
    : 'day';

  const active = getActivePlanner();

  const onChangeView = useCallback(
    (next: CalendarView) => {
      const qs = next === 'day' ? '' : `?view=${next}`;
      router.replace(`/planner${qs}`, { scroll: false });
    },
    [router],
  );

  const dday = getDday(currentPersona);
  const examName = active.name;

  const switchAction = (
    <Link
      href="/planner/manage"
      className="text-pullim-blue-600 hover:bg-pullim-blue-50 inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pullim-blue-500 focus-visible:ring-offset-1"
    >
      다른 시간표로 전환
      <ArrowRight className="h-3 w-3" />
    </Link>
  );

  // view별 헤더 메타 — 활성 플래너 이름·D-day·진행률 노출
  const headerProps = (() => {
    if (view === 'day') {
      const summary = plannerProgress();
      return {
        title: '오늘의 학습 — 4월 24일 목요일',
        description: (
          <>
            <strong className="text-pullim-blue-700">{active.name}</strong>
            <span className="mx-1">·</span>
            <DDayChip dday={dday} examName={examName} />
            <span className="mx-1">·</span>
            {summary.done}/{summary.total} 블록 완료
          </>
        ),
        navLabel: '2026.04.24 (목)',
      };
    }
    if (view === 'week') {
      const m = getWeekMeta();
      return {
        title: '4월 21일 — 27일',
        description: (
          <>
            <strong className="text-pullim-blue-700">{active.name}</strong>
            <span className="mx-1">·</span>
            이번 주 계획 <span className="font-mono text-pullim-slate-700 font-bold">{m.totalHours}h</span>
            <span className="mx-1">·</span>
            완료 <span className="font-mono text-pullim-success font-bold">{m.completedHours}h</span>
          </>
        ),
        navLabel: '2026.04 · 4주차',
        prevLabel: '지난 주',
        nextLabel: '다음 주',
      };
    }
    // month
    const m = getMonthMeta();
    return {
      title: '2026년 4월',
      description: (
        <>
          <strong className="text-pullim-blue-700">{active.name}</strong>까지 <DDayChip dday={dday} examName={examName} />
          <span className="mx-1">·</span>
          이번 달 학습 블록 <span className="font-mono font-bold">{m.totalBlocks}개</span>
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
      <BurnoutThresholdBanner score={todayBurnout.score} />
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

export default function PlannerHomePage() {
  return (
    <Suspense fallback={<div className="text-pullim-slate-400 py-10 text-center text-sm">시간표 불러오는 중…</div>}>
      <PlannerHome />
    </Suspense>
  );
}

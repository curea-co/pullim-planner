'use client';

import { useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { CalendarView } from '../components/calendar-shell';
import {
  currentPersona, getDday, plannerProgress, getActivePlanner,
  todayBurnout,
} from '@/lib/mock';
import { getWeekMeta } from '../components/views/week-view';
import { getMonthMeta } from '../components/views/month-view';
import HomePresenter from '../presenters/HomePresenter';

const VALID_VIEWS: CalendarView[] = ['day', 'week', 'month'];

/**
 * 풀림 플래너 홈 Container — 활성 플래너 시간표 (일/주/월).
 *
 * redirect 가드: 첫 방문(localStorage에 'pullim:visited' 없음) + view 파라미터 없음 시 onboarding 우회.
 * deep link(view 파라미터 있음)는 스킵.
 */
export default function HomeContainer() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get('view');
  const view: CalendarView = (VALID_VIEWS as string[]).includes(raw ?? '')
    ? (raw as CalendarView)
    : 'day';

  useEffect(() => {
    if (raw) return;
    try {
      if (localStorage.getItem('pullim:visited')) return;
      localStorage.setItem('pullim:visited', '1');
      router.replace('/planner/onboarding?firstVisit=1');
    } catch {
      // localStorage 비활성 브라우저 — 매 방문 redirect 방지를 위해 무시
    }
  }, [raw, router]);

  const onChangeView = useCallback(
    (next: CalendarView) => {
      const qs = next === 'day' ? '' : `?view=${next}`;
      router.replace(`/planner${qs}`, { scroll: false });
    },
    [router],
  );

  const active = getActivePlanner();
  const dday = getDday(currentPersona);
  const daySummary = plannerProgress();
  const weekMeta = getWeekMeta();
  const monthMeta = getMonthMeta();

  return (
    <HomePresenter
      view={view}
      examName={active.name}
      dday={dday}
      burnoutScore={todayBurnout.score}
      daySummary={daySummary}
      weekMeta={weekMeta}
      monthMeta={monthMeta}
      onChangeView={onChangeView}
    />
  );
}

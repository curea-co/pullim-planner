'use client';

import { useCallback } from 'react';
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
 * 온보딩 라우팅은 서버 세션 상태가 권위다: `/planner/me` 404 → auth 'onboarding' 상태 →
 * `RequireAuth` 가 `/planner/onboarding` 으로 보낸다. 프로필이 있으면 'authenticated' 라 홈을
 * 그대로 보여준다. (이전의 localStorage 'pullim:visited' 첫 방문 가드는 서버 상태와 어긋나
 * — 프로필이 있어도 방문 플래그가 없으면 온보딩으로 튕김 — 제거했다. 흡수 §10.)
 */
export default function HomeContainer() {
  const router = useRouter();
  const params = useSearchParams();
  const raw = params.get('view');
  const view: CalendarView = (VALID_VIEWS as string[]).includes(raw ?? '')
    ? (raw as CalendarView)
    : 'month';

  const onChangeView = useCallback(
    (next: CalendarView) => {
      const qs = next === 'month' ? '' : `?view=${next}`;
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

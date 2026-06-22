'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { CalendarView } from '../components/calendar-shell';
import {
  currentPersona, getDday, plannerProgress, getActivePlanner,
  todayBurnout,
} from '@/lib/mock';
import { getWeekMeta } from '../components/views/week-view';
import { getMonthMeta } from '../components/views/month-view';
import HomePresenter from '../presenters/HomePresenter';
import { WelcomeModal } from '../components/welcome-modal';

const VALID_VIEWS: CalendarView[] = ['day', 'week', 'month'];
const WELCOME_STORAGE_KEY = 'pullim:welcome-shown';

/**
 * 풀림 플래너 홈 Container — 활성 플래너 시간표 (일/주/월).
 *
 * 온보딩 라우팅은 서버 세션 상태가 권위다: `/planner/me` 404 → auth 'onboarding' 상태 →
 * `RequireAuth` 가 `/planner/onboarding` 으로 보낸다. 프로필이 있으면 'authenticated' 라 홈을
 * 그대로 보여준다. (이전의 localStorage 'pullim:visited' 첫 방문 게이팅은 제거됐다 — 흡수 §10.)
 *
 * WelcomeModal: 게이팅이 아닌 정보 제공 목적 — sessionStorage로 세션당 1회 자동 표시.
 * LNB "매뉴얼" 항목은 `?help=1`로 링크돼 클릭 시 모달을 재오픈한다.
 */
export default function HomeContainer() {
  const router = useRouter();
  const params = useSearchParams();

  const raw = params.get('view');
  const view: CalendarView = (VALID_VIEWS as string[]).includes(raw ?? '')
    ? (raw as CalendarView)
    : 'month';

  const helpParam = params.get('help') === '1';
  const [welcomeOpen, setWelcomeOpen] = useState(false);

  useEffect(() => {
    const alreadyShown = sessionStorage.getItem(WELCOME_STORAGE_KEY) === '1';
    if (helpParam || !alreadyShown) {
      setWelcomeOpen(true);
    }
  }, [helpParam]);

  const handleCloseWelcome = useCallback(() => {
    sessionStorage.setItem(WELCOME_STORAGE_KEY, '1');
    setWelcomeOpen(false);
    if (helpParam) {
      router.replace('/planner', { scroll: false });
    }
  }, [helpParam, router]);

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
    <>
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
      <WelcomeModal open={welcomeOpen} onClose={handleCloseWelcome} />
    </>
  );
}

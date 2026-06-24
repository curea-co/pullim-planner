'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { CalendarView } from '../components/calendar-shell';
import {
  currentPersona, getDday, plannerProgress, getActivePlanner,
  todayBurnout, getBlocksForDayOffset,
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
    : 'day';

  const helpParam = params.get('help') === '1';
  const [welcomeOpen, setWelcomeOpen] = useState(false);

  // 기간 이동 offset (0=기준 기간). 일/주/월 공용.
  const [offset, setOffset] = useState(0);
  const handlePrev = useCallback(() => setOffset(o => o - 1), []);
  const handleNext = useCallback(() => setOffset(o => o + 1), []);
  const handleReset = useCallback(() => setOffset(0), []);

  // 뷰가 바뀌면(토글·뒤로가기·외부 ?view= 진입 모두) offset을 기준 기간으로 리셋.
  // offset이 URL과 분리돼 있어, 이전 뷰의 offset이 남아 다른 뷰에 빈 화면이 뜨는 것을 방지.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOffset(0);
  }, [view]);

  useEffect(() => {
    // sessionStorage 는 클라이언트 전용 — 서버 렌더는 항상 닫힘(false)으로 hydration 일치시키고,
    // 마운트 후 이 effect 에서만 연다. 첫 페인트 직후 1회 여는 의도된 setState 라 룰을 끈다.
    const alreadyShown = sessionStorage.getItem(WELCOME_STORAGE_KEY) === '1';
    if (helpParam || !alreadyShown) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWelcomeOpen(true);
    }
  }, [helpParam]);

  const handleCloseWelcome = useCallback(() => {
    sessionStorage.setItem(WELCOME_STORAGE_KEY, '1');
    setWelcomeOpen(false);
    if (helpParam) {
      // help 만 제거하고 나머지 search param(view 등)은 보존 — 도움말만 닫아도
      // 보던 뷰(/planner?view=week)가 day 로 리셋되는 회귀 방지 (codex).
      const next = new URLSearchParams(params);
      next.delete('help');
      const qs = next.toString();
      router.replace(`/planner${qs ? `?${qs}` : ''}`, { scroll: false });
    }
  }, [helpParam, params, router]);

  const onChangeView = useCallback(
    (next: CalendarView) => {
      setOffset(0); // 뷰 전환 시 기준 기간으로 리셋
      const qs = next === 'day' ? '' : `?view=${next}`;
      router.replace(`/planner${qs}`, { scroll: false });
    },
    [router],
  );

  const active = getActivePlanner();
  const dday = getDday(currentPersona);
  const daySummary = plannerProgress(getBlocksForDayOffset(offset));
  const weekMeta = getWeekMeta(offset);
  const monthMeta = getMonthMeta(offset);

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
        offset={offset}
        onPrev={handlePrev}
        onNext={handleNext}
        onReset={handleReset}
        onChangeView={onChangeView}
      />
      <WelcomeModal open={welcomeOpen} onClose={handleCloseWelcome} />
    </>
  );
}

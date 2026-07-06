'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { CalendarView } from '../components/calendar-shell';
import {
  currentPersona, getDday, plannerProgress, getActivePlanner,
  todayBurnout, getBlocksForDayOffset,
  type MonthDay, type TimeBlock, type WeekDay,
} from '@/lib/mock';
import {
  buildMonthDays, buildWeekDays, ddayFrom, monthDatesFor, monthLabelOf,
  shiftIsoDate, weekDatesFor,
} from '@/lib/planner/home-data';
import { getWeekMeta } from '../components/views/week-view';
import { getMonthMeta } from '../components/views/month-view';
import { useHomeBlocks } from '../hooks/use-home-blocks';
import HomePresenter from '../presenters/HomePresenter';
import { WelcomeModal } from '../components/welcome-modal';

const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1';

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

  // 기간 이동 offset (0=기준 기간). 일/주/월 공용. URL 파라미터 `d`가 소스 —
  // 주간 그리드·월간 캘린더에서 특정 날짜 일간 뷰로 딥링크(?view=day&d=N)하려면 offset이
  // URL에 있어야 하기 때문(B4b ③). 뷰 단위(일=일수, 주=주수, 월=월수)는 뷰 안에서 일관.
  const dRaw = params.get('d');
  const parsed = dRaw === null ? 0 : Number.parseInt(dRaw, 10);
  const offset = Number.isFinite(parsed) ? parsed : 0;

  // view·offset을 URL로 직렬화 — view=day·offset=0은 파라미터 생략(정규 URL 유지).
  const buildUrl = useCallback((v: CalendarView, o: number) => {
    const sp = new URLSearchParams();
    if (v !== 'day') sp.set('view', v);
    if (o !== 0) sp.set('d', String(o));
    const qs = sp.toString();
    return `/planner${qs ? `?${qs}` : ''}`;
  }, []);

  const handlePrev = useCallback(
    () => router.replace(buildUrl(view, offset - 1), { scroll: false }),
    [router, buildUrl, view, offset],
  );
  const handleNext = useCallback(
    () => router.replace(buildUrl(view, offset + 1), { scroll: false }),
    [router, buildUrl, view, offset],
  );
  const handleReset = useCallback(
    () => router.replace(buildUrl(view, 0), { scroll: false }),
    [router, buildUrl, view],
  );
  const handleJump = useCallback(
    (o: number) => router.replace(buildUrl(view, o), { scroll: false }),
    [router, buildUrl, view],
  );

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
      // 뷰 전환 시 offset 리셋 — buildUrl이 offset=0이면 `d`를 생략하므로 자동으로 기준 기간.
      router.replace(buildUrl(next, 0), { scroll: false });
    },
    [router, buildUrl],
  );

  // 실데이터(B4) — 배포 환경은 pullim-api 활성 플래너·블록, dev bypass 는 기존 mock 경로 유지.
  const real = useHomeBlocks(!DEV_AUTH_BYPASS, view, offset);

  let examName: string;
  let dday: number;
  let daySummary: { done: number; total: number };
  let weekMeta: { totalHours: number; completedHours: number };
  let monthMeta: { totalBlocks: number };
  let dayBlocks: TimeBlock[] | undefined;
  let weekDays: WeekDay[] | undefined;
  let monthDays: MonthDay[] | undefined;
  let monthLabel: string | undefined;

  if (DEV_AUTH_BYPASS) {
    const active = getActivePlanner();
    examName = active.name;
    dday = getDday(currentPersona);
    daySummary = plannerProgress(getBlocksForDayOffset(offset));
    weekMeta = getWeekMeta(offset);
    monthMeta = getMonthMeta(offset);
  } else {
    const { active, blocksByDate, todayIso } = real;
    examName = active?.examLabel || active?.name || '';
    dday = active ? ddayFrom(todayIso, active.examStartDate) : 0;
    dayBlocks = blocksByDate[shiftIsoDate(todayIso, offset)] ?? [];
    weekDays =
      view === 'week'
        ? buildWeekDays(weekDatesFor(todayIso, offset), blocksByDate, todayIso)
        : undefined;
    const monthDates = monthDatesFor(todayIso, offset);
    monthDays =
      view === 'month'
        ? buildMonthDays(monthDates, blocksByDate, todayIso, active
            ? { startDate: active.examStartDate, label: active.examLabel }
            : undefined)
        : undefined;
    monthLabel = view === 'month' ? monthLabelOf(monthDates[0]) : undefined;
    daySummary = plannerProgress(dayBlocks);
    weekMeta = weekDays
      ? {
          totalHours:
            Math.round(weekDays.reduce((s, d) => s + d.totalMinutes, 0) / 6) / 10,
          completedHours:
            Math.round(
              weekDays.reduce((s, d) => s + (d.totalMinutes * d.completionPct) / 100, 0) / 6,
            ) / 10,
        }
      : { totalHours: 0, completedHours: 0 };
    monthMeta = monthDays
      ? { totalBlocks: monthDays.reduce((s, d) => s + d.blockCount, 0) }
      : { totalBlocks: 0 };
  }

  return (
    <>
      <HomePresenter
        view={view}
        examName={examName}
        dday={dday}
        burnoutScore={todayBurnout.score}
        daySummary={daySummary}
        weekMeta={weekMeta}
        monthMeta={monthMeta}
        offset={offset}
        onPrev={handlePrev}
        onNext={handleNext}
        onReset={handleReset}
        onJumpOffset={handleJump}
        onChangeView={onChangeView}
        dayBlocks={dayBlocks}
        weekDays={weekDays}
        monthDays={monthDays}
        monthLabel={monthLabel}
      />
      <WelcomeModal open={welcomeOpen} onClose={handleCloseWelcome} />
    </>
  );
}

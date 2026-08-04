'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
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
import { computeBurnoutFromWeek } from '@/lib/planner/burnout';
import type { BurnoutSnapshot, ConditionLevel } from '@/lib/mock';
import { todayIsoKst } from '@/components/features/planner-builder/components/builder-types';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api-client';
import { pullimPlannerClient } from '@/lib/planner/pullim-client';
import { getCustomization, type Customization } from '@/lib/hooks/use-planner-customization';
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

  // 라우터 반영은 비동기라, URL이 갱신되기 전 사용자가 이전/다음을 빠르게 연타하면 두 클릭이
  // 같은 stale offset 을 읽어 입력이 누락된다(기존 setOffset(o=>o+1) 엔 없던 회귀, codex).
  // ref로 최신 목표 offset 을 동기 추적해 상대 이동을 ref 기준으로 계산한다. URL이 외부(뒤로가기
  // 등)로 바뀌면 아래 effect가 ref를 URL 기준으로 재동기화한다.
  const offsetRef = useRef(offset);
  useEffect(() => {
    offsetRef.current = offset;
  }, [offset]);

  // view·offset을 URL로 직렬화 — 기존 search param(help 등)은 보존하고 view·d만 갱신한다
  // (빈 params에서 시작하면 ?help=1 등이 뷰 전환·기간 이동 한 번에 사라짐, codex).
  // view=day·offset=0은 해당 파라미터 생략(정규 URL 유지).
  const buildUrl = useCallback((v: CalendarView, o: number) => {
    const sp = new URLSearchParams(params);
    if (v !== 'day') sp.set('view', v); else sp.delete('view');
    if (o !== 0) sp.set('d', String(o)); else sp.delete('d');
    const qs = sp.toString();
    return `/planner${qs ? `?${qs}` : ''}`;
  }, [params]);

  // 목표 offset 을 ref에 즉시 반영(연타 누적) 후 URL 갱신 — 상대 이동의 단일 경로.
  const go = useCallback(
    (v: CalendarView, o: number) => {
      offsetRef.current = o;
      router.replace(buildUrl(v, o), { scroll: false });
    },
    [router, buildUrl],
  );

  const handlePrev = useCallback(() => go(view, offsetRef.current - 1), [go, view]);
  const handleNext = useCallback(() => go(view, offsetRef.current + 1), [go, view]);
  const handleReset = useCallback(() => go(view, 0), [go, view]);
  const handleJump = useCallback((o: number) => go(view, o), [go, view]);

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
    // 뷰 전환 시 offset 리셋 — go(_,0)이 ref·URL 모두 0으로(buildUrl이 d 생략=기준 기간).
    (next: CalendarView) => go(next, 0),
    [go],
  );

  // 실데이터(B4) — 배포 환경은 pullim-api 활성 플래너·블록, dev bypass 는 기존 mock 경로 유지.
  const real = useHomeBlocks(!DEV_AUTH_BYPASS, view, offset);

  // 블록 완료 기록 저장(실모드, pullim-api #416 write) — 성공 시 블록 재조회로 진행률·상태 반영.
  // 실패 시 false 반환 → 다이얼로그가 닫히지 않고 재시도 가능. mock 경로(bypass)엔 미주입(데모 유지).
  const realActiveId = real.active?.id;
  const realRefetch = real.refetch;

  // 번아웃 안전도 — BE on-read 집계(QA #48, GET /planner/planners/:id/burnout) 우선.
  // 로드 전·호출 실패(구버전 BE 포함)는 FE 주간 계산 폴백. available:false 는 판정 보류('–').
  const [serverBurnout, setServerBurnout] = useState<
    { plannerId: string; snapshot: BurnoutSnapshot | null } | null
  >(null);
  const [burnoutTick, setBurnoutTick] = useState(0);
  useEffect(() => {
    if (DEV_AUTH_BYPASS || !realActiveId) return;
    let alive = true;
    pullimPlannerClient
      .burnout(realActiveId)
      .then((res) => {
        if (!alive) return;
        setServerBurnout({
          plannerId: realActiveId,
          // available:false 의 BE 조건은 '블록 없음·시작 직후(오늘뿐+완료 0)' 뿐 — 기존
          // null(데이터 부족)과 의미가 동일해 별도 상태 없이 같은 문구('안전도 –' + 데이터
          // 부족 안내)로 수렴한다(pullim-api #480 api.md 계약).
          snapshot: res.available
            ? {
                score: res.score!,
                trend: res.trend!,
                factors: res.factors ?? [],
                recommendBreak: res.recommendBreak ?? false,
              }
            : null,
        });
      })
      .catch(() => {
        // 실패(재집계 포함) — stale 서버 스냅샷을 비워 FE 주간 계산 폴백으로 내린다(Codex).
        if (alive) setServerBurnout(null);
      });
    return () => { alive = false; };
    // deps 에 view·offset 포함 — 호출 실패 후에도 화면 탐색 시 BE 집계를 재시도한다
    // (가벼운 read — 성공 상태의 중복 호출도 최신화라 무해, Codex).
  }, [realActiveId, burnoutTick, view, offset]);

  // 오늘 컨디션(저장+표기용, QA 결정 08-04) — 실모드는 서버 복원·저장, bypass 는 로컬 데모(3).
  // KST 오늘을 1분 간격으로 재계산해 자정 전환을 실제로 감지한다(마운트 1회 계산이던
  // useHomeBlocks.todayIso 로는 effect 가 재실행되지 않음 — Codex). 날짜가 바뀌면 파생이
  // 자동으로 '선택 전'이 되고, 날짜 키 effect 가 오늘 값을 재조회한다.
  const [kstToday, setKstToday] = useState(() => todayIsoKst());
  useEffect(() => {
    const id = setInterval(() => {
      setKstToday((prev) => {
        const now = todayIsoKst();
        return now === prev ? prev : now;
      });
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  const [conditionState, setConditionState] = useState<
    { date: string; level: ConditionLevel } | null
  >(DEV_AUTH_BYPASS ? { date: 'local', level: 3 } : null);
  // 경쟁 가드 — ① 저장 요청 세대(늦은 실패·늦은 조회가 최신 선택을 덮지 않게)
  // ② 마지막 **서버 확인 값**(confirmed): 실패 롤백은 직전 로컬 값이 아니라 이 값으로만
  //   복원한다(연속 실패 시 저장 안 된 값이 UI에 남는 회귀 방지 — Codex).
  const conditionReqSeq = useRef(0);
  const confirmedCondition = useRef<{ date: string; level: ConditionLevel } | null>(null);
  useEffect(() => {
    if (DEV_AUTH_BYPASS) return;
    let alive = true;
    conditionReqSeq.current = 0; // 새 날짜 — 세대 리셋(오늘 값 복원 허용)
    pullimPlannerClient
      .condition()
      .then((res) => {
        if (!alive || res.level === null) return;
        confirmedCondition.current = {
          date: res.date,
          level: res.level as ConditionLevel,
        };
        if (conditionReqSeq.current > 0) return; // 조회 중 사용자가 이미 선택 — 낙관 값 유지
        setConditionState(confirmedCondition.current);
      })
      .catch(() => {}); // 실패 — '선택 전' 유지(다음 선택 시 저장 시도)
    return () => { alive = false; };
  }, [kstToday]);
  const handleConditionChange = useCallback((level: ConditionLevel) => {
    if (DEV_AUTH_BYPASS) {
      setConditionState({ date: 'local', level });
      return;
    }
    const seq = ++conditionReqSeq.current;
    setConditionState({ date: kstToday, level }); // 낙관 반영
    pullimPlannerClient
      .saveCondition(level)
      .then((res) => {
        // 최신 요청의 성공만 반영 — 늦게 도착한 이전 성공이 롤백 기준·화면을 오래된
        // 값으로 오염시키지 않게(Codex).
        if (seq !== conditionReqSeq.current || res.level === null) return;
        confirmedCondition.current = {
          date: res.date,
          level: res.level as ConditionLevel,
        };
        // 화면도 서버 확정값으로 동기화 — 자정 경계에서 저장이 새 날짜로 확정되면
        // 낙관 상태의 옛 날짜 키 때문에 '미기록'으로 보이는 어긋남 방지(Codex).
        setConditionState(confirmedCondition.current);
      })
      .catch((error) => {
        if (seq !== conditionReqSeq.current) return; // 이후 선택 있음 — 롤백 금지
        setConditionState(confirmedCondition.current); // 마지막 서버 확인 값(없으면 '선택 전')
        // 401은 on401 래퍼가 전역 세션 만료를 이미 전파 — 네트워크 오류로 오도하지 않게
        // 토스트 생략(완료 저장 handleCompleteBlock 과 동일 패턴).
        if (!(error instanceof ApiError && error.statusCode === 401)) {
          toast.error('컨디션 저장에 실패했어요', {
            description: '네트워크 상태를 확인하고 다시 시도해주세요.',
          });
        }
      });
  }, [kstToday]);
  const condition: ConditionLevel | null = DEV_AUTH_BYPASS
    ? (conditionState?.level ?? 3)
    : conditionState && conditionState.date === kstToday
      ? conditionState.level
      : null;

  const handleCompleteBlock = useCallback(
    async (blockId: string, input: { accuracy?: number; emotion?: number; notes?: string }) => {
      if (!realActiveId) return false;
      try {
        await pullimPlannerClient.completeBlock(realActiveId, blockId, input);
        realRefetch();
        setBurnoutTick((t) => t + 1); // 완료 기록 반영 — 안전도 재집계
        return true;
      } catch (error) {
        // 401은 on401 래퍼가 전역 세션 만료를 이미 전파(로그인 복구 흐름) — 네트워크 오류 안내로
        // 오도하지 않게 토스트 생략(Codex #137). 그 외 오류만 재시도 안내.
        if (!(error instanceof ApiError && error.statusCode === 401)) {
          toast.error('완료 저장에 실패했어요', {
            description: '네트워크 상태를 확인하고 다시 시도해주세요.',
          });
        }
        return false;
      }
    },
    [realActiveId, realRefetch],
  );

  let examName: string;
  let dday: number;
  let daySummary: { done: number; total: number };
  let weekMeta: { totalHours: number; completedHours: number };
  let monthMeta: { totalBlocks: number };
  let dayBlocks: TimeBlock[] | undefined;
  let weekDays: WeekDay[] | undefined;
  let monthDays: MonthDay[] | undefined;
  let monthLabel: string | undefined;
  // 홈 뷰 꾸미기(layout·palette) — 실 active 플래너의 customization을 뷰로 주입해 저장값을 반영한다.
  // dev bypass면 undefined로 두어 뷰가 mock getActiveCustomization으로 폴백한다(기존 동작 유지).
  let customization: Customization | undefined;
  // 히어로 배너는 뷰·기간 이동과 무관하게 **항상 실제 오늘·이번 주** 기준으로 요약한다.
  // (뷰 offset 을 그대로 쓰면 week/month·미래 날짜에서 "오늘 X/Y"가 엉뚱한 날짜로, "이번 주 Nh"가
  //  사라진다 — Codex #124). daySummary/weekMeta(헤더용)는 뷰 맥락대로 두고, 히어로만 분리.
  let heroDaySummary: { done: number; total: number };
  let heroWeekMeta: { totalHours: number; completedHours: number };
  // 번아웃 — 실모드는 이번 주 실블록(완료 메타 포함)로 계산(QA — mock 하드코딩 대체), bypass는 mock.
  let burnout: BurnoutSnapshot | null;
  // QA #7 — 활성 계획표 유무. 없으면 히어로가 D-DAY 대신 "아직 시간표가 없어요"를 보여준다.
  let hasActivePlanner: boolean;

  if (DEV_AUTH_BYPASS) {
    const active = getActivePlanner();
    hasActivePlanner = true;
    examName = active.name;
    dday = getDday(currentPersona);
    daySummary = plannerProgress(getBlocksForDayOffset(offset));
    weekMeta = getWeekMeta(offset);
    monthMeta = getMonthMeta(offset);
    heroDaySummary = plannerProgress(getBlocksForDayOffset(0)); // 실제 오늘
    heroWeekMeta = getWeekMeta(0); // 이번 주
    burnout = todayBurnout;
  } else {
    const { active, blocksByDate, heroBlocksByDate, todayIso } = real;
    customization = getCustomization(active);
    hasActivePlanner = Boolean(active);
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
    // 히어로 — 이번 주 7일 기준. 현재 뷰가 이미 조회한 날짜(blocksByDate)를 우선 재사용하고
    // 나머지만 heroBlocksByDate 로 채운다: 같은 날짜를 두 조회가 서로 다르게 성공/실패해도
    // 히어로와 헤더·본문이 어긋나지 않게 단일 소스(blocksByDate)를 우선한다(Codex #126 R3).
    const heroMerged = { ...heroBlocksByDate, ...blocksByDate };
    heroDaySummary = plannerProgress(heroMerged[todayIso] ?? []);
    const heroWeekDays = buildWeekDays(
      weekDatesFor(todayIso, 0),
      heroMerged,
      todayIso,
    );
    heroWeekMeta = {
      totalHours: Math.round(heroWeekDays.reduce((s, d) => s + d.totalMinutes, 0) / 6) / 10,
      completedHours:
        Math.round(
          heroWeekDays.reduce((s, d) => s + (d.totalMinutes * d.completionPct) / 100, 0) / 6,
        ) / 10,
    };
    // BE 집계 로드 완료 시 그 결과가 권위(available:false=보류 '–') — 미로드·실패만 FE 폴백.
    burnout =
      serverBurnout && serverBurnout.plannerId === active?.id
        ? serverBurnout.snapshot
        : computeBurnoutFromWeek(heroMerged, todayIso, weekDatesFor(todayIso, 0));
  }

  return (
    <>
      <HomePresenter
        view={view}
        examName={examName}
        dday={dday}
        hasActivePlanner={hasActivePlanner}
        burnout={burnout}
        condition={condition}
        onConditionChange={handleConditionChange}
        daySummary={daySummary}
        weekMeta={weekMeta}
        monthMeta={monthMeta}
        heroDaySummary={heroDaySummary}
        heroWeekMeta={heroWeekMeta}
        offset={offset}
        onPrev={handlePrev}
        onNext={handleNext}
        onReset={handleReset}
        onJumpOffset={handleJump}
        onChangeView={onChangeView}
        dayBlocks={dayBlocks}
        onCompleteSubmit={DEV_AUTH_BYPASS ? undefined : handleCompleteBlock}
        customization={customization}
        weekDays={weekDays}
        monthDays={monthDays}
        monthLabel={monthLabel}
      />
      <WelcomeModal open={welcomeOpen} onClose={handleCloseWelcome} />
    </>
  );
}

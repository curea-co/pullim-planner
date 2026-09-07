'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PullimBlock, PullimPlanner } from '@/lib/api-client';
import { pullimPlannerClient, pullimToPlanner } from '@/lib/planner/pullim-client';
import {
  monthDatesFor, pullimToTimeBlock, shiftIsoDate, todayKstIso, weekDatesFor,
} from '@/lib/planner/home-data';
import type { Planner, TimeBlock } from '@/lib/mock';
import type { CalendarView } from '../components/calendar-shell';

export interface HomeBlocksData {
  /** 'loading' 첫 로드 중 · 'ready' 조회 완료(active 없음 포함) · 'error' 목록 조회 실패 */
  status: 'loading' | 'ready' | 'error';
  /** 활성 플래너(mock `Planner` shape) — 없으면 null(시간표 미생성/미활성). */
  active: Planner | null;
  /** 요청 기간(view·offset)의 날짜별 블록. 키 = `YYYY-MM-DD`. */
  blocksByDate: Record<string, TimeBlock[]>;
  /**
   * 현재 뷰 기간 조회가 **실패**했나. `blocksByDate` 는 실패해도 형태(빈 배열 키)를 유지하므로
   * 이 플래그가 없으면 "계획이 없는 기간"과 구분되지 않는다 — 화면에는 똑같이 빈 달력이 뜬다.
   */
  blocksError: boolean;
  /**
   * 히어로 배너 전용 — **이번 주(offset 0) 7일**의 날짜별 블록. 뷰·offset 네비게이션과 무관하게
   * 활성 플래너당 1회 조회(오늘이 이번 주에 포함되므로 오늘·이번 주 통계를 모두 커버). 히어로가
   * 어느 뷰·기간에서도 "실제 오늘/이번 주"를 정확히 표시하기 위함(Codex #124/#126).
   */
  heroBlocksByDate: Record<string, TimeBlock[]>;
  /** 히어로 기간 조회가 실패했나 — 실패분을 0 으로 읽으면 히어로가 **적게 세어** 보고한다. */
  heroBlocksError: boolean;
  /** 오늘(KST) — 파생 계산의 공통 기준. */
  todayIso: string;
  /** 블록 재조회 트리거 — 완료 기록 저장 등 쓰기 후 기간·히어로 블록을 다시 읽는다. */
  refetch: () => void;
  /**
   * 재조회가 진행 중인가 — 실패 화면이 "누르긴 눌렸다"를 보여주기 위한 것이다. 실패 플래그를
   * 미리 내려서 화면을 치우는 대신, 실패 화면을 **유지한 채** 진행 중임을 알린다.
   */
  retrying: boolean;
  /** 사용자 재시도 — 목록까지 포함해 전부 다시 읽는다(실패 화면의 [다시 시도]). */
  retry: () => void;
}

/** 활성 시간표가 없을 때의 블록 맵 — 렌더마다 새 객체를 만들지 않도록 모듈 상수로 둔다. */
const NO_BLOCKS: Record<string, TimeBlock[]> = Object.freeze({});

/** 요청한 날짜 전부를 키로 갖는 빈 맵 — 조회 실패 시의 형태. */
function emptyByDate(dates: readonly string[]): Record<string, TimeBlock[]> {
  return Object.fromEntries(dates.map((d) => [d, [] as TimeBlock[]]));
}

/**
 * 기간 응답(평평한 배열)을 날짜별로 묶는다.
 *
 * **요청한 날짜를 전부 키로 만든 뒤 채운다** — 블록이 없는 날도 `[]` 로 존재해야 한다. 뷰들이
 * 키 존재 여부로 "그날 계획이 있나"를 판단하므로, 빈 날의 키가 없으면 하루씩 부르던 시절과
 * 동작이 달라진다(그때는 실패·빈 날 모두 `[]` 가 들어갔다).
 *
 * ⚠️ **키를 응답에서 읽는다는 것이 새 실패면이다.** 하루씩 부르던 시절의 키는 *요청 파라미터*라
 * 응답이 무슨 모양이든 자리에 꽂혔다. 지금은 `raw.date` 가 계약(`YYYY-MM-DD`)에서 한 글자만
 * 어긋나도 — 예컨대 BE 가 `TO_CHAR` 를 잃고 ISO datetime 을 돌려주면 — **전부** 어느 키에도
 * 안 맞아 조용히 사라진다. 화면은 "계획 없음"과 똑같이 보인다(pullim-api #629 가 정확히 그 회귀였다).
 * 그래서 앞 10 자로 정규화하고, 그래도 창 밖인 것은 **세어서 콘솔에 남긴다** — 소리 없이 버리지 않는다.
 */
function groupByDate(
  blocks: readonly PullimBlock[],
  dates: readonly string[],
): Record<string, TimeBlock[]> {
  const byDate = emptyByDate(dates);
  const dropped: string[] = [];
  for (const raw of blocks) {
    const key = String(raw.date ?? '').slice(0, 10);
    if (byDate[key]) byDate[key].push(pullimToTimeBlock(raw));
    else dropped.push(String(raw.date));
  }
  if (dropped.length > 0) {
    console.error(
      `[home] 기간 응답의 date 가 요청 창(${dates[0]}~${dates[dates.length - 1]}) 밖이다 — ` +
        `${dropped.length}/${blocks.length}건 버림. 표본:`,
      dropped.slice(0, 3),
    );
  }
  return byDate;
}

/**
 * 홈 실데이터 훅(B4) — 활성 플래너 + view·offset 기간의 블록을 pullim-api 에서 읽는다.
 *
 * - `enabled=false`(dev bypass)면 아무것도 fetch 하지 않는다 — Container 가 mock 경로 유지.
 * - 활성 플래너는 최초 1회, 블록은 view·offset 변경마다 해당 기간을 **한 번**에 조회한다
 *   (`GET blocks?from=&to=` — pullim-api #630). 종전에는 하루당 1회씩 월간이면 31회를 동시에
 *   쐈고, 히어로 7회까지 합쳐 한 화면에 37개가 나갔다. 그 뭉치가 토큰 만료와 겹치면 수십 개가
 *   한꺼번에 401 을 받았다(dev 실측: 9ms 안 15건).
 * - 기간 조회는 전부 아니면 전무다 — 실패하면 그 기간이 빈 형태가 되고 `blocksError` 가 선다.
 *   **형태만 유지하고 플래그를 안 세우면 실패가 "계획 없음"으로 위장된다.**
 */
export function useHomeBlocks(
  enabled: boolean,
  view: CalendarView,
  offset: number,
): HomeBlocksData {
  const todayIso = useMemo(() => todayKstIso(), []);
  const [status, setStatus] = useState<HomeBlocksData['status']>('loading');
  const [activeRaw, setActiveRaw] = useState<PullimPlanner | null>(null);
  const [blocksByDate, setBlocksByDate] = useState<Record<string, TimeBlock[]>>({});
  const [blocksError, setBlocksError] = useState(false);
  const [heroBlocksByDate, setHeroBlocksByDate] = useState<Record<string, TimeBlock[]>>({});
  const [heroBlocksError, setHeroBlocksError] = useState(false);
  // 쓰기(완료 기록 등) 후 재조회 트리거 — 증가 시 기간·히어로 블록 effect가 다시 돈다.
  const [refreshTick, setRefreshTick] = useState(0);
  // 사용자 재시도 — 목록 effect까지 다시 돈다. refreshTick 과 분리한 이유는, 완료 기록 저장마다
  // 목록을 다시 읽을 이유가 없기 때문이다(쓰기 1회당 불필요한 요청 1개가 는다).
  const [retryTick, setRetryTick] = useState(0);
  const refetch = useCallback(() => setRefreshTick((t) => t + 1), []);
  // ⚠️ **여기서 실패 플래그를 미리 내리지 않는다.** 내리면 클릭한 순간 실패 카드가 사라지고,
  // 응답이 올 때까지 (아직 빈) `blocksByDate` 가 "계획 없음"으로 렌더된다 — 이 훅이 막으려는
  // 위장이 재시도 구간에서 그대로 재현된다. 플래그는 **성공 콜백에서만** 내린다.
  const retry = useCallback(() => {
    setStatus('loading');
    setRetryTick((t) => t + 1);
  }, []);

  // 활성 플래너 — 최초 1회(+ 사용자 재시도).
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    pullimPlannerClient.list().then(
      (planners) => {
        if (!alive) return;
        setActiveRaw(planners.find((p) => p.active) ?? null);
        setStatus('ready');
      },
      (error) => {
        if (!alive) return;
        console.error('[home] 시간표 목록 조회 실패', error);
        setStatus('error');
      },
    );
    return () => {
      alive = false;
    };
  }, [enabled, retryTick]);

  // 기간 블록 — active·view·offset 변경마다 **한 번**.
  useEffect(() => {
    if (!enabled || !activeRaw) return;
    let alive = true;
    const dates =
      view === 'day'
        ? [shiftIsoDate(todayIso, offset)]
        : view === 'week'
          ? weekDatesFor(todayIso, offset)
          : monthDatesFor(todayIso, offset);
    void pullimPlannerClient
      .blocksRange(activeRaw.id, dates[0], dates[dates.length - 1])
      .then((bs) => {
        if (!alive) return;
        setBlocksByDate(groupByDate(bs, dates));
        setBlocksError(false);
      })
      // 기간 조회는 전부 아니면 전무다 — 하루씩 부르던 시절의 "그 날짜만 빈 배열" 부분 실패가
      // 사라진다. 형태는 유지하되 **실패했다는 사실을 남긴다** — 안 그러면 빈 달력과 구분이 안 된다.
      .catch((error) => {
        if (!alive) return;
        console.error(`[home] 기간 블록 조회 실패 (${dates[0]}~${dates[dates.length - 1]})`, error);
        setBlocksByDate(emptyByDate(dates));
        setBlocksError(true);
      });
    return () => {
      alive = false;
    };
  }, [enabled, activeRaw, view, offset, todayIso, refreshTick, retryTick]);

  // 히어로 전용 이번 주 블록 — 활성 플래너당 1회(view·offset 무관). 오늘이 이번 주에 포함돼
  // 오늘·이번 주 히어로 통계를 모두 커버한다.
  useEffect(() => {
    if (!enabled || !activeRaw) return;
    let alive = true;
    const dates = weekDatesFor(todayIso, 0);
    void pullimPlannerClient
      .blocksRange(activeRaw.id, dates[0], dates[dates.length - 1])
      .then((bs) => {
        if (!alive) return;
        setHeroBlocksByDate(groupByDate(bs, dates));
        setHeroBlocksError(false);
      })
      .catch((error) => {
        if (!alive) return;
        console.error(`[home] 히어로 주간 블록 조회 실패 (${dates[0]}~${dates[dates.length - 1]})`, error);
        setHeroBlocksByDate(emptyByDate(dates));
        setHeroBlocksError(true);
      });
    return () => {
      alive = false;
    };
  }, [enabled, activeRaw, todayIso, refreshTick, retryTick]);

  // 활성 시간표가 없으면 조회할 것이 없다 — **이전 플래너에서 남은 것을 그대로 들고 있으면
  // 안 된다.** 블록 effect 는 `!activeRaw` 에서 조기 반환하므로 스스로 플래그를 못 내린다.
  // 실패 상태로 시간표가 비활성화·삭제되면 「진짜 빈 상태」가 실패 화면으로 보이고, 남은
  // `blocksByDate` 는 남의 블록이 된다. 상태를 하나 더 두는 대신 여기서 파생한다 — 저장하지
  // 않으면 어긋날 수 없다.
  const hasActive = activeRaw !== null;

  return {
    status: enabled ? status : 'ready',
    active: activeRaw ? pullimToPlanner(activeRaw) : null,
    blocksByDate: hasActive ? blocksByDate : NO_BLOCKS,
    blocksError: hasActive && blocksError,
    heroBlocksByDate: hasActive ? heroBlocksByDate : NO_BLOCKS,
    heroBlocksError: hasActive && heroBlocksError,
    todayIso,
    // 목록 재조회가 도는 동안 true — `retry()` 가 status 를 'loading' 으로 되돌리고,
    // 목록 effect 가 'ready'/'error' 로 끝낸다. 첫 로드에도 true 지만 그때는 실패 화면 자체가
    // 없어서 보이지 않는다.
    retrying: enabled && status === 'loading',
    refetch,
    retry,
  };
}

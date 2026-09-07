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
   * 히어로 배너 전용 — **이번 주(offset 0) 7일**의 날짜별 블록. 뷰·offset 네비게이션과 무관하게
   * 활성 플래너당 1회 조회(오늘이 이번 주에 포함되므로 오늘·이번 주 통계를 모두 커버). 히어로가
   * 어느 뷰·기간에서도 "실제 오늘/이번 주"를 정확히 표시하기 위함(Codex #124/#126).
   */
  heroBlocksByDate: Record<string, TimeBlock[]>;
  /** 오늘(KST) — 파생 계산의 공통 기준. */
  todayIso: string;
  /** 블록 재조회 트리거 — 완료 기록 저장 등 쓰기 후 기간·히어로 블록을 다시 읽는다. */
  refetch: () => void;
}

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
 * 창 밖 날짜가 섞여 오더라도 무시한다 — 키를 먼저 고정했기 때문에 응답이 계약을 벗어나도
 * 화면 형태가 흔들리지 않는다.
 */
function groupByDate(
  blocks: readonly PullimBlock[],
  dates: readonly string[],
): Record<string, TimeBlock[]> {
  const byDate = emptyByDate(dates);
  for (const raw of blocks) {
    byDate[raw.date]?.push(pullimToTimeBlock(raw));
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
 * - 기간 조회는 전부 아니면 전무다 — 실패 시 그 기간이 빈 상태가 된다. 목록(list) 실패만 'error'.
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
  const [heroBlocksByDate, setHeroBlocksByDate] = useState<Record<string, TimeBlock[]>>({});
  // 쓰기(완료 기록 등) 후 재조회 트리거 — 증가 시 기간·히어로 블록 effect가 다시 돈다.
  const [refreshTick, setRefreshTick] = useState(0);
  const refetch = useCallback(() => setRefreshTick((t) => t + 1), []);

  // 활성 플래너 — 최초 1회.
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    pullimPlannerClient.list().then(
      (planners) => {
        if (!alive) return;
        setActiveRaw(planners.find((p) => p.active) ?? null);
        setStatus('ready');
      },
      () => {
        if (alive) setStatus('error');
      },
    );
    return () => {
      alive = false;
    };
  }, [enabled]);

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
        if (alive) setBlocksByDate(groupByDate(bs, dates));
      })
      // 기간 조회는 전부 아니면 전무다 — 하루씩 부르던 시절의 "그 날짜만 빈 배열" 부분 실패가
      // 사라진다. 실패하면 그 기간을 빈 상태로 두고, 원인은 on401·콘솔에 남는다.
      .catch(() => {
        if (alive) setBlocksByDate(emptyByDate(dates));
      });
    return () => {
      alive = false;
    };
  }, [enabled, activeRaw, view, offset, todayIso, refreshTick]);

  // 히어로 전용 이번 주 블록 — 활성 플래너당 1회(view·offset 무관). 오늘이 이번 주에 포함돼
  // 오늘·이번 주 히어로 통계를 모두 커버한다.
  useEffect(() => {
    if (!enabled || !activeRaw) return;
    let alive = true;
    const dates = weekDatesFor(todayIso, 0);
    void pullimPlannerClient
      .blocksRange(activeRaw.id, dates[0], dates[dates.length - 1])
      .then((bs) => {
        if (alive) setHeroBlocksByDate(groupByDate(bs, dates));
      })
      .catch(() => {
        if (alive) setHeroBlocksByDate(emptyByDate(dates));
      });
    return () => {
      alive = false;
    };
  }, [enabled, activeRaw, todayIso, refreshTick]);

  return {
    status: enabled ? status : 'ready',
    active: activeRaw ? pullimToPlanner(activeRaw) : null,
    blocksByDate,
    heroBlocksByDate,
    todayIso,
    refetch,
  };
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import type { PullimPlanner } from '@pullim-planner/api-client';
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
  /** 오늘(KST) — 파생 계산의 공통 기준. */
  todayIso: string;
}

/**
 * 홈 실데이터 훅(B4) — 활성 플래너 + view·offset 기간의 블록을 pullim-api 에서 읽는다.
 *
 * - `enabled=false`(dev bypass)면 아무것도 fetch 하지 않는다 — Container 가 mock 경로 유지.
 * - 활성 플래너는 최초 1회, 블록은 view·offset 변경마다 해당 기간(일 1·주 7·월 ≤31일)을
 *   병렬 조회한다(BE `GET blocks` 가 date 단위 — 기간 API 는 후속 최적화).
 * - 조회 실패한 날짜는 빈 배열(부분 실패 허용) — 목록(list) 실패만 'error'.
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

  // 기간 블록 — active·view·offset 변경마다.
  useEffect(() => {
    if (!enabled || !activeRaw) return;
    let alive = true;
    const dates =
      view === 'day'
        ? [shiftIsoDate(todayIso, offset)]
        : view === 'week'
          ? weekDatesFor(todayIso, offset)
          : monthDatesFor(todayIso, offset);
    void Promise.all(
      dates.map((date) =>
        pullimPlannerClient
          .blocks(activeRaw.id, date)
          .then((bs) => [date, bs.map(pullimToTimeBlock)] as const)
          .catch(() => [date, [] as TimeBlock[]] as const),
      ),
    ).then((entries) => {
      if (alive) setBlocksByDate(Object.fromEntries(entries));
    });
    return () => {
      alive = false;
    };
  }, [enabled, activeRaw, view, offset, todayIso]);

  return {
    status: enabled ? status : 'ready',
    active: activeRaw ? pullimToPlanner(activeRaw) : null,
    blocksByDate,
    todayIso,
  };
}

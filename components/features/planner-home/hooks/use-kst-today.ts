'use client';

import { useEffect, useState } from 'react';
import { todayKstIso } from '@/lib/planner/home-data';

/**
 * 오늘(KST) `YYYY-MM-DD` — **자정을 넘기면 값이 바뀐다.**
 *
 * ## 왜 필요한가
 *
 * 홈은 「오늘」을 마운트 시점에 한 번 계산해 쓰고 있었다(`useHomeBlocks` 의
 * `useMemo(() => todayKstIso(), [])`). 밤에 열어 둔 탭은 자정을 넘겨도 **어제 날짜**로
 * 계속 조회하고 계산한다 — 헤더 제목, 주간·월간 창, 히어로의 「오늘/이번 주」가 전부
 * 어제 기준이다. 새 날짜 블록은 조회조차 되지 않는다.
 *
 * `HomeContainer` 는 컨디션 때문에 이미 같은 틱을 갖고 있었고, 그 주석에 이 문제가
 * 적혀 있었다 — 「마운트 1회 계산이던 useHomeBlocks.todayIso 로는 effect 가 재실행되지
 * 않음」. 알려진 채로 남아 있던 자리다. 그 틱을 여기로 모아 **하나만 돌린다.**
 *
 * ⚠️ **이 훅을 한 화면에서 두 번 부르지 마라.** 훅 인스턴스마다 `useEffect` 가 따로 돌아
 * 타이머가 그만큼 생긴다 — 「공유」가 아니라 각자 도는 것이고, 자정 부근에 두 값이 서로
 * 다른 렌더에 갱신된다. 홈에서는 `useHomeBlocks` 안에서만 부르고, 컨테이너는 그 반환값
 * (`todayIso`)을 쓴다. 소비자가 늘어 진짜 공유가 필요해지면 모듈 단일 구독
 * (`useSyncExternalStore`)으로 바꿔야 한다 — 훅을 여러 번 부르는 것으로는 안 된다.
 *
 * ## 값이 안 바뀌면 같은 문자열을 그대로 돌려준다
 *
 * updater 가 이전 값과 비교해 같으면 그대로 반환하므로, 1분마다 리렌더가 나지 않고
 * 이 값을 deps 에 넣은 effect 도 **날짜가 실제로 바뀔 때만** 다시 돈다. 재조회를 하루에
 * 한 번으로 묶는 것이 이 비교의 목적이다.
 */
export function useKstToday(): string {
  const [today, setToday] = useState(() => todayKstIso());
  useEffect(() => {
    const id = setInterval(() => {
      setToday((prev) => {
        const now = todayKstIso();
        return now === prev ? prev : now;
      });
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  return today;
}

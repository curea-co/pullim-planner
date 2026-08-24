'use client';

import { useCallback } from 'react';
import type { Routine } from '@/lib/mock';
import { updateRoutine as updateMockRoutine } from '@/lib/mock/routine';
import { pullimPlannerClient, pullimToRoutine, toRoutineTimePatch } from '@/lib/planner/pullim-client';

const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1';

/**
 * 위저드 4단계 충돌 배너의 '시간 안쪽으로 옮기기' — 루틴 **원본**의 시각을 바꾼다.
 *
 * 루틴은 시간표가 아니라 사용자 라이브러리 소유라(`GET /planner/routines`) 이 시간표에만
 * 적용되는 시각 오버라이드를 둘 자리가 계약에 없다(`routineApplications` 는 id 참조뿐).
 * 그래서 화면에서만 옮기는 시늉을 하지 않고 실제로 `PATCH /planner/routines/:routineId` 를
 * 호출한다 — 다른 시간표에도 반영된다는 사실은 호출 전 확인 다이얼로그가 알린다.
 *
 * PATCH 본문에는 **실제로 바뀐 필드만** 담는다(`toRoutineTimePatch` — 시각 2개 + 파생값
 * `expectedMinutes`). 제목/과목/유형/요일까지 화면에 들고 있던 값으로 되보내면 다른 탭·기기에서
 * 방금 바꾼 값을 stale 로 덮어쓴다.
 */
export function useRoutineTimeUpdate(
  routines: Routine[],
  setRoutines: (next: Routine[]) => void,
) {
  return useCallback(
    async (routineId: string, patch: { startTime: string; endTime: string }) => {
      const current = routines.find(r => r.id === routineId);
      if (!current) throw new Error('루틴을 찾지 못했어요');
      const next: Routine = { ...current, ...patch };

      if (DEV_AUTH_BYPASS) {
        updateMockRoutine(routineId, patch);
      } else {
        const saved = await pullimPlannerClient.updateRoutine(
          routineId,
          toRoutineTimePatch(patch.startTime, patch.endTime),
        );
        // 서버 응답을 반영한다 — 시각의 `HH:MM` 정규화는 `pullimToRoutine` 이 맡는다.
        setRoutines(routines.map(r => (r.id === routineId ? pullimToRoutine(saved) : r)));
        return;
      }
      setRoutines(routines.map(r => (r.id === routineId ? next : r)));
    },
    [routines, setRoutines],
  );
}

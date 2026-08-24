'use client';

import { useCallback } from 'react';
import type { Routine } from '@/lib/mock';
import { updateRoutine as updateMockRoutine } from '@/lib/mock/routine';
import { pullimPlannerClient, pullimToRoutine, toRoutinePatch } from '@/lib/planner/pullim-client';

const DEV_AUTH_BYPASS = process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS === '1';

/**
 * 위저드 4단계 충돌 배너의 '시간 안쪽으로 옮기기' — 루틴 **원본**의 시각을 바꾼다.
 *
 * 루틴은 시간표가 아니라 사용자 라이브러리 소유라(`GET /planner/routines`) 이 시간표에만
 * 적용되는 시각 오버라이드를 둘 자리가 계약에 없다(`routineApplications` 는 id 참조뿐).
 * 그래서 화면에서만 옮기는 시늉을 하지 않고 실제로 `PATCH /planner/routines/:routineId` 를
 * 호출한다 — 다른 시간표에도 반영된다는 사실은 호출 전 확인 다이얼로그가 알린다.
 *
 * 시각만 바꿔도 BE 는 전체 필드를 받는 부분 수정 본문을 쓰므로(`toRoutinePatch`), 목록에
 * 들고 있던 루틴에 새 시각을 얹어 보낸다.
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
          toRoutinePatch({
            title: next.title, subject: next.subject, type: next.type,
            startTime: next.startTime, endTime: next.endTime, weekdays: next.weekdays,
          }),
        );
        // 서버가 정규화한 값(예: 'HH:MM:SS')을 그대로 반영한다.
        setRoutines(routines.map(r => (r.id === routineId ? pullimToRoutine(saved) : r)));
        return;
      }
      setRoutines(routines.map(r => (r.id === routineId ? next : r)));
    },
    [routines, setRoutines],
  );
}

/**
 * 서버로 나가는 루틴 적용 목록 만들기 — **살아 있는 루틴만** 남긴다.
 *
 * ## 왜 걸러야 하나
 *
 * `RoutineEntity` 에 soft-delete 가 없어 루틴 삭제는 **하드 삭제**다. 그런데 그 루틴이
 * 구워 둔 블록은 시간표에 남고, 수정 화면의 프리필은 그 블록에서 역산한 id 를 쓴다
 * (`appliedRoutineIds` — `lib/api-client/pullim-planner.ts` 참조). 그래서 **삭제된 루틴의
 * id 가 폼에 되살아난다.**
 *
 * pullim-api 는 `!routine || routine.userId !== userId` 면 400 `적용할 수 없는 루틴이
 * 포함되어 있습니다.` 를 낸다 — 미리보기·생성·저장 셋 다. 저장이 막히면 그 시간표는
 * **이름 한 글자도 못 바꾸는 상태**가 된다. 죽은 id 를 지울 UI 가 따로 없기 때문이다.
 * (QA 2026-09-04 N-01)
 *
 * 이미 **로컬 휴리스틱 미리보기**(`step-content.tsx` 의 `generatePreview`)와 **충돌 배너**
 * (`diagnoseRoutineFit`)는 같은 방식으로 죽은 id 를 버린다. 서버로 나가는 자리만 안 버리고
 * 있었다 — 이 함수는 그 불일치를 없앤다.
 *
 * ## `known === null` 의 뜻 — 「루틴이 없다」가 아니라 「목록을 못 받았다」
 *
 * 이 구분이 **이 함수의 핵심**이다. 루틴 목록 조회가 실패했을 때 빈 배열로 걸러 버리면
 * 살아 있는 루틴까지 전부 떨어지는데, 저장 경로에서 그 결과는 「비어 있음」이 아니라
 * **「전부 해제하라」** 는 명령이다 — BE 가 `routineApplications` 를 *원하는 적용 집합 전체*
 * 로 보고 현재 적용과 diff 하기 때문(`EditPlannerContainer` 의 같은 취지 주석 참조).
 * 즉 **조회 실패 한 번이 사용자의 적용 루틴을 전부 지운다.**
 *
 * 그래서 모를 때는 거르지 않는다. 거르지 않으면 최악이 400(저장 실패, 되돌릴 수 있음)이고,
 * 잘못 거르면 최악이 블록 삭제(되돌릴 수 없음)다.
 */

import type { Routine } from '@/lib/mock';

/** `PullimRoutineApplication` 과 구조 호환 — `lib/planner` 를 api-client 타입에 묶지 않는다. */
export type RoutineApplicationInput = {
  routineId: string;
  endRange: 'exam';
};

/**
 * @param routineIds 폼이 고른 id — **순서가 의미를 갖는다**(먼저 놓인 루틴이 겹침에서 이긴다,
 *   `diagnoseRoutineFit` 주석 참조). 걸러도 순서는 보존한다.
 * @param known 살아 있는 루틴 목록. **`null` 이면 「모른다」** — 거르지 않고 그대로 보낸다.
 */
export function toRoutineApplications(
  routineIds: readonly string[],
  known: readonly Routine[] | null,
): RoutineApplicationInput[] {
  const live = known === null ? null : new Set(known.map((r) => r.id));
  return routineIds
    .filter((id) => live === null || live.has(id))
    .map((routineId) => ({ routineId, endRange: 'exam' as const }));
}

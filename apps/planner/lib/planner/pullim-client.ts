import {
  ApiError,
  createPullimPlannerClient,
  maskToWeekdays,
  weekdaysToMask,
  type PullimPlanner,
  type PullimPlannerClient,
  type PullimPlannerWrite,
  type PullimRoutine,
  type PullimRoutineClient,
  type PullimRoutineWrite,
  type PullimRoutinePatch,
} from '@pullim-planner/api-client';

import { notifyPullimSessionExpired } from '@/lib/auth/pullim-session-client';
import { minutesBetween, type Planner, type Routine, type RoutineSubject } from '@/lib/mock';
import type { BlockType } from '@/lib/mock';

/**
 * pullim-api(흡수형 planner) base/CSRF — `pullim-session-client` 와 동일 규칙.
 * prefix 없음(`/planner/*`). 회원 인증은 HttpOnly 쿠키(브라우저 자동 첨부, same-site `*.pullim.ai`).
 * dev: `NEXT_PUBLIC_PULLIM_API_URL=https://dev-api.pullim.ai`, `NEXT_PUBLIC_PULLIM_CSRF_COOKIE=dev-pullim-csrf`.
 */
const PULLIM_API_URL =
  process.env.NEXT_PUBLIC_PULLIM_API_URL ?? 'http://localhost:3000';
const CSRF_COOKIE_NAME =
  process.env.NEXT_PUBLIC_PULLIM_CSRF_COOKIE ?? 'local-pullim-csrf';

const rawPullimPlannerClient = createPullimPlannerClient({
  baseUrl: PULLIM_API_URL,
  csrfCookieName: CSRF_COOKIE_NAME,
});

/**
 * 401(쿠키 세션 만료·무효) 시 전역 세션 만료를 통지하도록 클라 메서드를 감싼다 — 흡수 §10.
 * 자체 BE 클라의 onSessionExpired(전역 전파)를 데이터 호출에서도 복원한다. auth-context 가
 * `onPullimSessionExpired` 로 구독해 상태를 unauthenticated 로 내린다.
 */
function on401<A extends unknown[], R>(
  fn: (...args: A) => Promise<R>,
): (...args: A) => Promise<R> {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        notifyPullimSessionExpired();
      }
      throw error;
    }
  };
}

/**
 * 앱 전역 pullim-api planner 데이터 클라이언트 싱글톤 — 흡수 전환 §10 cutover.
 *
 * 자체 BE planner 클라(`./client.ts` 의 레거시 구현, Bearer + 엔벨로프)를 대체한다. 인증은 쿠키
 * SSO(브라우저 자동 첨부)라 토큰을 클라가 들지 않고, 상태변경은 CSRF double-submit
 * (`csrfCookieName` 자동 동봉 + 회전 시 재부트스트랩). 모든 메서드는 401 에서 세션 만료를 통지한다.
 */
export const pullimPlannerClient: PullimPlannerClient & PullimRoutineClient = {
  list: on401(rawPullimPlannerClient.list),
  blocks: on401(rawPullimPlannerClient.blocks),
  create: on401(rawPullimPlannerClient.create),
  update: on401(rawPullimPlannerClient.update),
  remove: on401(rawPullimPlannerClient.remove),
  activate: on401(rawPullimPlannerClient.activate),
  archive: on401(rawPullimPlannerClient.archive),
  unarchive: on401(rawPullimPlannerClient.unarchive),
  duplicate: on401(rawPullimPlannerClient.duplicate),
  updateCustomization: on401(rawPullimPlannerClient.updateCustomization),
  routines: on401(rawPullimPlannerClient.routines),
  createRoutine: on401(rawPullimPlannerClient.createRoutine),
  updateRoutine: on401(rawPullimPlannerClient.updateRoutine),
  deleteRoutine: on401(rawPullimPlannerClient.deleteRoutine),
};

/**
 * pullim-api 응답(`PullimPlanner`) → FE mock `Planner` 뷰 어댑터.
 *
 * 두 타입은 구조가 동일하다(target/weekday·weekendHours/subjectUnits/enum). customization 만
 * API nullable → mock optional 로 정렬한다. 프리젠터·빌더가 기존 mock `Planner` 를 그대로 소비한다.
 */
export function pullimToPlanner(p: PullimPlanner): Planner {
  return {
    ...p,
    customization: p.customization ?? undefined,
  } as Planner;
}

/**
 * 빌더 폼 패치(`formToPlannerPatch` 반환) → pullim-api 쓰기 본문(`PullimPlannerWrite`).
 * subjectUnits 의 `undefined` 값은 BE 검증(문자열 배열 맵)을 통과하지 못하므로 제거한다.
 */
export function toPullimWrite(
  patch: Omit<Planner, 'id' | 'active' | 'archived' | 'createdAt' | 'updatedAt'>,
): PullimPlannerWrite {
  const subjectUnits: Record<string, string[]> = {};
  for (const [subject, units] of Object.entries(patch.subjectUnits)) {
    if (units) subjectUnits[subject] = units;
  }
  return {
    ...patch,
    subjectUnits,
  } as PullimPlannerWrite;
}

/**
 * pullim-api 루틴(`PullimRoutine`) → FE 뷰 `Routine` 어댑터.
 * 요일은 비트마스크(`weekdayMask`) → 배열(`maskToWeekdays`, 0=월…6=일)로 변환한다.
 * subject/type 은 BE 가 string 이지만 BE 가 FE enum 집합으로만 발급하므로 뷰 union 으로 단언한다.
 */
export function pullimToRoutine(r: PullimRoutine): Routine {
  return {
    id: r.id,
    title: r.title,
    subject: r.subject as RoutineSubject,
    type: r.type as BlockType,
    startTime: r.startTime,
    endTime: r.endTime,
    weekdays: maskToWeekdays(r.weekdayMask) as Routine['weekdays'],
  };
}

/** 루틴 폼값(id 제외) → pullim-api 쓰기 본문(`PullimRoutineWrite`). */
export function toRoutineWrite(
  form: Omit<Routine, 'id'>,
): PullimRoutineWrite {
  return {
    title: form.title,
    subject: form.subject,
    type: form.type,
    startTime: form.startTime,
    endTime: form.endTime,
    expectedMinutes: minutesBetween(form.startTime, form.endTime),
    weekdayMask: weekdaysToMask(form.weekdays),
  };
}

/** 루틴 폼값(부분) → pullim-api 부분 수정 본문(`PullimRoutinePatch`). */
export function toRoutinePatch(
  form: Omit<Routine, 'id'>,
): PullimRoutinePatch {
  return toRoutineWrite(form);
}

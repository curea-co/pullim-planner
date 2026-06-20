import {
  createPullimPlannerClient,
  type PullimPlanner,
  type PullimPlannerClient,
  type PullimPlannerWrite,
} from '@pullim-planner/api-client';

import type { Planner } from '@/lib/mock';

/**
 * pullim-api(흡수형 planner) base/CSRF — `pullim-session-client` 와 동일 규칙.
 * prefix 없음(`/planner/*`). 회원 인증은 HttpOnly 쿠키(브라우저 자동 첨부, same-site `*.pullim.ai`).
 * dev: `NEXT_PUBLIC_PULLIM_API_URL=https://dev-api.pullim.ai`, `NEXT_PUBLIC_PULLIM_CSRF_COOKIE=dev-pullim-csrf`.
 */
const PULLIM_API_URL =
  process.env.NEXT_PUBLIC_PULLIM_API_URL ?? 'http://localhost:3000';
const CSRF_COOKIE_NAME =
  process.env.NEXT_PUBLIC_PULLIM_CSRF_COOKIE ?? 'local-pullim-csrf';

/**
 * 앱 전역 pullim-api planner 데이터 클라이언트 싱글톤 — 흡수 전환 §10 cutover.
 *
 * 자체 BE planner 클라(`./client.ts` 의 레거시 구현, Bearer + 엔벨로프)를 대체한다. 인증은 쿠키
 * SSO(브라우저 자동 첨부)라 토큰을 클라가 들지 않고, 상태변경은 CSRF double-submit
 * (`csrfCookieName` 자동 동봉 + 회전 시 재부트스트랩).
 */
export const pullimPlannerClient: PullimPlannerClient =
  createPullimPlannerClient({
    baseUrl: PULLIM_API_URL,
    csrfCookieName: CSRF_COOKIE_NAME,
  });

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

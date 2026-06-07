import {
  createPlannerClient,
  type PlannerClient,
} from '@pullim-planner/api-client';
import type {
  Planner as ApiPlanner,
  PlannerWriteInput,
} from '@pullim-planner/types';

import { authClient } from '@/lib/auth/client';
import type { Planner } from '@/lib/mock';

/**
 * BE API base — 글로벌 prefix `/api` 포함. auth client 와 동일 규칙
 * (`lib/auth/client.ts`). 로컬 기본값은 NestJS dev 포트(4030).
 */
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4030/api';

/**
 * 앱 전역 planner 클라이언트 싱글톤.
 *
 * 인증 호출은 `authClient.withAuth` 에 위임한다 (access token 첨부 + 401 시 refresh
 * 1회 후 재시도). planner 엔드포인트는 per-user 인증 필수라 로그인 사용자의 본인
 * 시간표에만 적용된다.
 */
export const plannerClient: PlannerClient = createPlannerClient(
  { baseUrl: API_BASE_URL },
  authClient,
);

/**
 * API 응답(`@pullim-planner/types` Planner) → FE mock `Planner` 뷰 타입 어댑터.
 *
 * 두 타입은 구조가 동일하고 enum 만 다르다(API=string, mock=유니온). 프리젠터·빌더가
 * 기존 mock `Planner` 타입을 그대로 소비하도록 경계에서 변환한다. customization 은
 * API nullable → mock optional 로 정렬한다.
 */
export function apiToPlanner(p: ApiPlanner): Planner {
  return {
    ...p,
    customization: p.customization ?? undefined,
  } as Planner;
}

/**
 * 빌더 폼 패치(`formToPlannerPatch` 반환) → API 쓰기 본문(`PlannerWriteInput`).
 *
 * 구조는 동일하나 mock 유니온/Partial 타입이라 캐스트한다(런타임 동일). subjectUnits 의
 * `undefined` 값은 BE 검증(문자열 배열 맵)을 통과하지 못하므로 제거한다.
 */
export function toWriteInput(
  patch: Omit<Planner, 'id' | 'active' | 'archived' | 'createdAt' | 'updatedAt'>,
): PlannerWriteInput {
  const subjectUnits: Record<string, string[]> = {};
  for (const [subject, units] of Object.entries(patch.subjectUnits)) {
    if (units) subjectUnits[subject] = units;
  }
  return {
    ...patch,
    subjectUnits,
  } as PlannerWriteInput;
}

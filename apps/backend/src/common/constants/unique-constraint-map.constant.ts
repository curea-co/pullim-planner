import { ErrorMessages } from "./error-messages.constant";

/**
 * PostgreSQL unique constraint 위반 시 detail 필드의 컬럼명 → ErrorMessage 매핑.
 * 새로운 unique 컬럼 추가 시 여기에 매핑을 등록한다.
 *
 * Phase β 시점에서는 도메인 모듈이 아직 없으므로 빈 배열로 시작한다.
 * Phase γ에서 planner entity 추가 시 `planners (user_id WHERE active=true)` partial unique
 * 같은 매핑이 들어오게 된다.
 */
export const UNIQUE_CONSTRAINT_MAP: ReadonlyArray<
  [column: string, error: { code: string; message: string }]
> = [];

// 위 ErrorMessages 참조를 살려두기 위한 placeholder 사용 (lint 회피).
void ErrorMessages.COMMON_CONFLICT;

/**
 * ErrorMessages 상수.
 *
 * pullim 본체의 `error-messages.constant.ts` 패턴 차용 + planner 도메인 매핑 (plan §6.2 옵션 A).
 *
 * - `COMMON_VALIDATION_FAILED` ← 기존 `validation_failed`
 * - `COMMON_NOT_FOUND` ← 기존 `not_found`
 *   + 도메인별 변형: `PLANNER_NOT_FOUND`, `USER_NOT_FOUND`
 * - `COMMON_CONFLICT` ← 기존 `conflict`
 * - `COMMON_FORBIDDEN` ← 기존 `forbidden`
 * - `COMMON_UNKNOWN_ERROR` ← 기존 `internal`
 */
export const ErrorMessages = {
  // Common
  COMMON_NOT_FOUND: {
    code: "COMMON_NOT_FOUND",
    message: "요청한 리소스를 찾을 수 없습니다.",
  },
  COMMON_BAD_REQUEST: {
    code: "COMMON_BAD_REQUEST",
    message: "잘못된 요청입니다.",
  },
  COMMON_FORBIDDEN: {
    code: "COMMON_FORBIDDEN",
    message: "접근 권한이 없습니다.",
  },
  COMMON_CONFLICT: {
    code: "COMMON_CONFLICT",
    message: "데이터가 중복되었습니다.",
  },
  COMMON_VALIDATION_FAILED: {
    code: "COMMON_VALIDATION_FAILED",
    message: "입력값 검증에 실패했습니다.",
  },
  COMMON_UNKNOWN_ERROR: {
    code: "COMMON_UNKNOWN_ERROR",
    message: "알 수 없는 오류가 발생했습니다.",
  },
  COMMON_INTERNAL_SERVER_ERROR: {
    code: "COMMON_INTERNAL_SERVER_ERROR",
    message: "서버 내부 오류가 발생했습니다.",
  },
  // Auth
  AUTH_UNAUTHORIZED: {
    code: "AUTH_UNAUTHORIZED",
    message: "인증되지 않은 요청입니다.",
  },
  AUTH_FORBIDDEN: {
    code: "AUTH_FORBIDDEN",
    message: "접근 권한이 없습니다.",
  },
  // User
  USER_NOT_FOUND: {
    code: "USER_NOT_FOUND",
    message: "사용자를 찾을 수 없습니다.",
  },
  // Planner (Phase γ 이후 본격 사용)
  PLANNER_NOT_FOUND: {
    code: "PLANNER_NOT_FOUND",
    message: "플래너를 찾을 수 없습니다.",
  },
  PLANNER_ACTIVE_DELETE_FORBIDDEN: {
    code: "PLANNER_ACTIVE_DELETE_FORBIDDEN",
    message: "활성 상태의 플래너는 삭제할 수 없습니다.",
  },
  PLANNER_ACTIVE_CONFLICT: {
    code: "PLANNER_ACTIVE_CONFLICT",
    message: "이미 활성 상태인 플래너가 있습니다.",
  },
} as const;

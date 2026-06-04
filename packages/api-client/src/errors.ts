import type { ApiErrorEnvelope } from "@pullim-planner/types";

/**
 * BE 표준 에러 envelope(`{ success: false, error }`)을 감싼 예외.
 *
 * 호출자는 `code`(도메인 에러 코드: `validation_failed`/`conflict`/`unauthorized`…)
 * 또는 `statusCode`(HTTP)로 분기한다.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(error: ApiErrorEnvelope["error"]) {
    super(error.message);
    this.name = "ApiError";
    this.code = error.code;
    this.statusCode = error.statusCode;
    // ES2022 target: 내장 Error 확장 시 prototype 체인 보정 (instanceof 보장).
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

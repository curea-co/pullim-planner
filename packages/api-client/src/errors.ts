import type { ApiErrorEnvelope } from "@pullim-planner/types";

/**
 * BE 에러를 감싼 공통 예외 — 두 전송 계층이 모두 이 타입으로 정규화한다:
 * 자체 BE envelope(`{ success: false, error }`, `http.ts`)와 pullim-api NestJS 에러
 * (`{ message, error, statusCode }`, `cookie-http.ts`).
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

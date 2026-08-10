/** 정규화된 API 에러 페이로드 — pullim-api NestJS 에러를 `cookie-http.ts`가 이 형태로 변환한다. */
export interface ApiErrorPayload {
  code: string;
  message: string;
  statusCode: number;
}

/**
 * API 에러를 감싼 공통 예외 — pullim-api NestJS 에러
 * (`{ message, error, statusCode }`)를 `cookie-http.ts`가 이 타입으로 정규화한다.
 *
 * 호출자는 `code`(도메인 에러 코드: `validation_failed`/`conflict`/`unauthorized`…)
 * 또는 `statusCode`(HTTP)로 분기한다.
 */
export class ApiError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(error: ApiErrorPayload) {
    super(error.message);
    this.name = "ApiError";
    this.code = error.code;
    this.statusCode = error.statusCode;
    // ES2022 target: 내장 Error 확장 시 prototype 체인 보정 (instanceof 보장).
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

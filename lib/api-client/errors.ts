/** 정규화된 API 에러 페이로드 — pullim-api NestJS 에러를 `cookie-http.ts`가 이 형태로 변환한다. */
export interface ApiErrorPayload {
  code: string;
  message: string;
  statusCode: number;
  /**
   * **세션이 죽은 것이 확정된** 401 인가 — 재발급까지 시도했으나 재발급 자체가 만료를
   * 확정(`refreshSession()` 이 false)한 경우에만 true.
   *
   * 401 이라고 다 로그아웃시키면 안 된다. 한 화면이 수십 개를 동시에 쏘는 구간
   * (`use-home-blocks` 의 날짜별 블록 조회)에서 그중 **하나만** 일과성 401 을 받아도 앱 전체가
   * 중앙 로그인으로 튕긴다 — 화면은 그 날짜만 비어 보일 뿐이라 사용자에겐 원인이 안 보인다.
   * (QA 2026-09-04 N-02)
   *
   * 그 판정은 `cookie-http` 가 이미 하고 있다: 401 → 재발급 → 재시도. 재발급이 false 면
   * 세션 만료 확정이고, 재시도까지 하고도 401 이면 **그 요청의 문제**다. 이 플래그가 그
   * 구분을 소비자(`on401`)에게 그대로 전달한다 — 같은 판정을 두 번 하지 않는다.
   */
  sessionExpired?: boolean;
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
  /** 세션 만료가 **확정**된 401 인가 — `ApiErrorPayload.sessionExpired` 참조. */
  readonly sessionExpired: boolean;

  constructor(error: ApiErrorPayload) {
    super(error.message);
    this.name = "ApiError";
    this.code = error.code;
    this.statusCode = error.statusCode;
    this.sessionExpired = error.sessionExpired ?? false;
    // ES2022 target: 내장 Error 확장 시 prototype 체인 보정 (instanceof 보장).
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

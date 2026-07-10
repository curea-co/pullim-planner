import { ApiError } from "./errors";
import { buildUrl } from "./url";

/** CSRF 면제(안전) HTTP 메서드 — double-submit 토큰 불요. */
const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * pullim-api(통합 모놀리식 IdP) 전용 쿠키/CSRF 전송 계층.
 *
 * 자체 BE(`http.ts`)와 계약이 다르므로 별도 모듈로 둔다 — 자체 BE 호출을 깨지 않기 위해
 * additive 로 추가한다(흡수 전환 §10, 쿠키 SSO).
 *
 * 자체 BE(`http.ts`)와의 차이:
 * - **인증**: `Authorization: Bearer` 가 아니라 **HttpOnly 쿠키**(access/refresh) — 모든 요청에
 *   `credentials: "include"` 로 자동 첨부. (ADR-010)
 * - **CSRF**: 상태변경 요청은 double-submit — `GET /auth/csrf` 로 받은 토큰을 `X-CSRF-Token`
 *   헤더로 동봉(쿠키 값과 일치해야 통과). GET 등 안전 메서드는 면제.
 * - **응답**: planner envelope(`{ success, data }`)가 아니라 **DTO 본문을 그대로** 반환.
 * - **에러**: NestJS 기본 `{ message, error, statusCode }` 형태.
 * - **base**: pullim-api 는 글로벌 prefix 가 없다(예: `http://localhost:3000`).
 */
export interface CookieHttpConfig {
  /** pullim-api origin. 예: `http://localhost:3000`(local) / `https://api.pullim.ai`(prod). */
  baseUrl: string;
  /** 테스트·SSR 에서 fetch 구현 주입 (기본: 전역 fetch). */
  fetchImpl?: typeof fetch;
  /**
   * non-HttpOnly CSRF 쿠키 이름(env별: `local-pullim-csrf`/`dev-pullim-csrf`/`prod-pullim-csrf`).
   * 지정 시 상태변경 요청에서 `csrfToken` 미주입이면 이 쿠키에서 자동 회수해 `X-CSRF-Token` 으로
   * 동봉한다(브라우저 한정). cutover 시 호출부마다 토큰을 손수 넘기는 부담을 없앤다.
   */
  csrfCookieName?: string;
  /**
   * 401(access 만료) 시 세션 재발급 시도 — `true` 반환이면 원 요청을 **1회** 재시도한다.
   * 재시도 요청은 다시 이 콜백을 타지 않고(무한루프 방지), CSRF 토큰은 `csrfCookieName`
   * 쿠키에서 재회수 가능하면 회전된 새 토큰으로 교체한다(불가 환경은 기존 명시 토큰 유지).
   * `false`/reject 면 원 401 을 그대로 던진다(→ 세션 만료 흐름).
   *
   * 주입자 책임: ① single-flight(동시 401 다발 시 refresh 1회) ② 콜백이 수행하는
   * `/auth/refresh` 호출 자체는 이 콜백이 없는 경로(`skipRefreshRetry`)로 보낼 것.
   */
  refreshSession?: () => Promise<boolean>;
}

export interface CookieRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** double-submit CSRF 토큰 → `X-CSRF-Token` 헤더로 동봉(상태변경 요청 필수). */
  csrfToken?: string;
  query?: Record<string, string | undefined>;
  /** 추가 헤더(선택). */
  headers?: Record<string, string>;
  /**
   * 401 시 `config.refreshSession` 재발급→재시도를 건너뛴다 — `/auth/refresh` 자기 자신 등
   * 재발급 경로가 무한루프에 빠지지 않게 하는 내부용 플래그(재시도된 요청에도 자동 설정).
   */
  skipRefreshRetry?: boolean;
}

/** NestJS 기본 에러 응답 형태. message 는 validation 시 배열일 수 있다. */
interface PullimApiErrorBody {
  /** 구조화 도메인 에러 코드(pullim-api 가 `{ code, message }` 로 내려줄 때). 있으면 보존. */
  code?: string;
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

/**
 * HTTP status → 자체 BE 표준 `ErrorMessages` 도메인 code.
 *
 * 자체 BE(`http.ts`)는 `HttpExceptionFilter.resolveFromStatus` 가 만든 envelope code 를
 * 그대로 노출한다. cookie-http 도 **동일한 code** 를 내야 FE 의 에러 분기(`ApiError.code`)가
 * 두 전송 계층에서 일관된다(흡수 전환 §10). 권위:
 * `apps/backend/src/common/filters/http-exception.filter.ts` + `error-messages.constant.ts`.
 */
const STATUS_TO_CODE: Record<number, string> = {
  400: "COMMON_BAD_REQUEST",
  401: "AUTH_UNAUTHORIZED",
  403: "AUTH_FORBIDDEN",
  404: "COMMON_NOT_FOUND",
  409: "COMMON_CONFLICT",
  422: "COMMON_VALIDATION_FAILED",
};

/** pullim-api 에러 본문을 ApiError 의 `{ code, message, statusCode }` 로 정규화. */
function toApiError(body: unknown, status: number): ApiError {
  const e = (body ?? {}) as PullimApiErrorBody;
  // ValidationPipe 는 message 를 배열로 내려준다(자체 BE 필터의 validation 판별과 동일).
  const isValidation = Array.isArray(e.message);
  const message = Array.isArray(e.message)
    ? e.message.join(", ")
    : (e.message ?? `요청에 실패했어요 (${status})`);
  // 자체 BE 와 동일한 도메인 code 로 정규화한다:
  //   1) pullim-api 가 구조화 `code` 를 주면 보존,
  //   2) 검증 실패(배열 message)면 `COMMON_VALIDATION_FAILED`(← Nest 기본 `error:"Bad Request"`
  //      를 `bad_request` 로 떨구지 않는다. 그래야 FE 의 validation 분기가 유지된다),
  //   3) 그 외엔 status → ErrorMessages 매핑(미러링), 미지정 status 는 `COMMON_UNKNOWN_ERROR`.
  const code =
    e.code ??
    (isValidation
      ? "COMMON_VALIDATION_FAILED"
      : (STATUS_TO_CODE[status] ?? "COMMON_UNKNOWN_ERROR"));
  return new ApiError({ code, message, statusCode: e.statusCode ?? status });
}

/**
 * pullim-api 를 호출한다. 쿠키 자동 첨부 + (옵션) CSRF 헤더 동봉.
 *
 * - 2xx → 응답 본문(JSON)을 그대로 반환. 빈 본문(204 등)은 `undefined` 이므로, 본문이 없는
 *   엔드포인트(예: logout)는 `cookieRequest<void>(...)` 로 호출해 타입을 좁혀라.
 * - 비 2xx → `ApiError` throw (NestJS 에러 본문 정규화).
 * - transport 실패 → `ApiError(code: "network_error", statusCode: 0)`.
 */
export async function cookieRequest<T>(
  config: CookieHttpConfig,
  path: string,
  opts: CookieRequestOptions = {},
): Promise<T> {
  const fetchImpl = config.fetchImpl ?? fetch;
  const method = opts.method ?? "GET";
  const url = buildUrl(config.baseUrl, path, opts.query);

  const headers: Record<string, string> = { ...opts.headers };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  // 상태변경 요청에만 CSRF 토큰을 동봉한다(안전 메서드는 면제). 명시 토큰이 없고
  // `csrfCookieName` 이 지정됐으면 쿠키에서 자동 회수(브라우저 한정).
  const csrfToken = SAFE_METHODS.has(method)
    ? undefined
    : (opts.csrfToken ??
      (config.csrfCookieName
        ? (readCsrfCookie(config.csrfCookieName) ?? undefined)
        : undefined));
  if (csrfToken) headers["X-CSRF-Token"] = csrfToken;

  let response: Response;
  let text: string;
  try {
    response = await fetchImpl(url.toString(), {
      method,
      headers,
      // 핵심: 쿠키(access/refresh/csrf) 자동 첨부. cross-origin 에선 CORS 가
      // Allow-Credentials: true + 명시 Origin 을 반환해야 브라우저가 쿠키를 보낸다.
      credentials: "include",
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    text = await response.text();
  } catch (error) {
    // 자체 BE(`http.ts`)와 동일하게 transport 실패를 ApiError(statusCode 0)로 정규화.
    throw new ApiError({
      code: "network_error",
      message:
        error instanceof Error
          ? error.message
          : "네트워크 오류가 발생했어요. 연결을 확인해주세요.",
      statusCode: 0,
    });
  }

  let payload: unknown = undefined;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = undefined;
    }
  }

  if (!response.ok) {
    // access 만료(401) — 재발급 콜백이 있으면 refresh 후 원 요청을 1회 재시도한다
    // (게이트키퍼 공통 계약: 401 → POST /auth/refresh → 원 API 재호출). 재시도 요청은
    // `skipRefreshRetry` 로 재진입을 막는다. 재발급 실패면 원 401 → 기존 세션 만료 흐름.
    if (
      response.status === 401 &&
      config.refreshSession &&
      !opts.skipRefreshRetry
    ) {
      const refreshed = await config.refreshSession().catch(() => false);
      if (refreshed) {
        // refresh 가 CSRF 쿠키를 회전시켰으므로 브라우저에선 쿠키에서 새 토큰을 재회수한다.
        // 쿠키를 읽을 수 없는 환경(SSR/테스트 — document 부재)은 기존 명시 토큰을 유지 —
        // 무효라면 403 이 나고 상위 mutate 의 CSRF 재부트스트랩 재시도가 처리한다.
        const rotatedToken = config.csrfCookieName
          ? readCsrfCookie(config.csrfCookieName)
          : null;
        return cookieRequest<T>(config, path, {
          ...opts,
          csrfToken: rotatedToken ?? opts.csrfToken,
          skipRefreshRetry: true,
        });
      }
    }
    throw toApiError(payload, response.status);
  }

  // pullim-api 는 DTO 본문을 그대로 반환한다(envelope 언랩 없음).
  return payload as T;
}

/**
 * CSRF 부트스트랩 — `GET /auth/csrf` 로 토큰을 받는다(동시에 non-HttpOnly CSRF 쿠키 설정).
 * 반환한 토큰을 이후 상태변경 요청의 `csrfToken` 옵션으로 동봉한다(double-submit).
 */
export async function bootstrapCsrf(
  config: CookieHttpConfig,
): Promise<string> {
  const { csrfToken } = await cookieRequest<{ csrfToken: string }>(
    config,
    "/auth/csrf",
  );
  return csrfToken;
}

/**
 * 브라우저 `document.cookie` 에서 non-HttpOnly CSRF 쿠키 값을 읽는다.
 *
 * 쿠키 이름은 환경마다 다르다(`local-pullim-csrf`/`dev-pullim-csrf`/`prod-pullim-csrf`)므로
 * 호출자가 이름을 주입한다. 부트스트랩 후 메모리 토큰이 없을 때(예: 새 탭/네비게이션)
 * 쿠키에서 직접 회수하는 폴백 경로다. 브라우저 밖(SSR·테스트)에선 `null`.
 */
export function readCsrfCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}

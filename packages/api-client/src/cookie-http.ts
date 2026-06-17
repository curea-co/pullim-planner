import { ApiError } from "./errors";

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
}

export interface CookieRequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** double-submit CSRF 토큰 → `X-CSRF-Token` 헤더로 동봉(상태변경 요청 필수). */
  csrfToken?: string;
  query?: Record<string, string | undefined>;
  /** 추가 헤더(선택). */
  headers?: Record<string, string>;
}

/** NestJS 기본 에러 응답 형태. message 는 validation 시 배열일 수 있다. */
interface PullimApiErrorBody {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

/** pullim-api 에러 본문을 ApiError 의 `{ code, message, statusCode }` 로 정규화. */
function toApiError(body: unknown, status: number): ApiError {
  const e = (body ?? {}) as PullimApiErrorBody;
  const message = Array.isArray(e.message)
    ? e.message.join(" ")
    : (e.message ?? `요청에 실패했어요 (${status})`);
  // `error`("Unauthorized"·"Forbidden"·"Not Found"…)를 snake_case code 로 환산.
  const code = e.error
    ? e.error.toLowerCase().replace(/\s+/g, "_")
    : `http_${status}`;
  return new ApiError({ code, message, statusCode: e.statusCode ?? status });
}

/**
 * pullim-api 를 호출한다. 쿠키 자동 첨부 + (옵션) CSRF 헤더 동봉.
 *
 * - 2xx → 응답 본문(JSON)을 그대로 반환. 빈 본문(204 등)은 `undefined`.
 * - 비 2xx → `ApiError` throw (NestJS 에러 본문 정규화).
 * - transport 실패 → `ApiError(code: "network_error", statusCode: 0)`.
 */
export async function cookieRequest<T>(
  config: CookieHttpConfig,
  path: string,
  opts: CookieRequestOptions = {},
): Promise<T> {
  const fetchImpl = config.fetchImpl ?? fetch;
  // baseUrl + path 연결. `new URL(path, base)` 는 절대 경로가 base 경로를 버리므로 쓰지 않는다.
  const base = config.baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${base}${normalizedPath}`);
  if (opts.query) {
    for (const [key, value] of Object.entries(opts.query)) {
      if (value !== undefined) url.searchParams.set(key, value);
    }
  }

  const headers: Record<string, string> = { ...opts.headers };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.csrfToken) headers["X-CSRF-Token"] = opts.csrfToken;

  let response: Response;
  let text: string;
  try {
    response = await fetchImpl(url.toString(), {
      method: opts.method ?? "GET",
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

  if (!response.ok) throw toApiError(payload, response.status);

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

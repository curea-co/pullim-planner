import type { ApiErrorEnvelope } from "@pullim-planner/types";

import { ApiError } from "./errors";
import { buildUrl } from "./url";

/** HTTP 전송 설정. `baseUrl`은 BE origin (예: `http://localhost:4030`). */
export interface HttpConfig {
  baseUrl: string;
  /** 테스트·SSR 에서 fetch 구현 주입 (기본: 전역 fetch). */
  fetchImpl?: typeof fetch;
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  /** 첨부할 Bearer 토큰 (access 또는 refresh). */
  bearer?: string | null;
  query?: Record<string, string | undefined>;
}

/**
 * BE 를 호출하고 envelope 을 푼다.
 *
 * - 성공(`{ success: true, data }`) → `data` 반환. void 응답(`{ success: true }`)은 `undefined`.
 * - 실패(`{ success: false, error }`) 또는 비 2xx → `ApiError` throw.
 */
export async function request<T>(
  config: HttpConfig,
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const fetchImpl = config.fetchImpl ?? fetch;
  const url = buildUrl(config.baseUrl, path, opts.query);

  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.bearer) headers.Authorization = `Bearer ${opts.bearer}`;

  let response: Response;
  let text: string;
  try {
    response = await fetchImpl(url.toString(), {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
    // 빈 본문(204 등) 방어: 파싱 실패 시 아래에서 빈 객체로 취급한다.
    text = await response.text();
  } catch (error) {
    // transport 실패(네트워크 단절·DNS·abort·타임아웃)를 공통 ApiError 로 정규화한다.
    // 이렇게 하지 않으면 TypeError/AbortError 가 그대로 새어나가 ApiError(code/statusCode)에
    // 의존하는 상위 에러 처리 경로가 갈라진다. statusCode 0 = 응답을 받지 못함.
    throw new ApiError({
      code: "network_error",
      message:
        error instanceof Error
          ? error.message
          : "네트워크 오류가 발생했어요. 연결을 확인해주세요.",
      statusCode: 0,
    });
  }

  let payload: unknown = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = {};
    }
  }

  const envelope = payload as { success?: boolean; data?: T };
  if (!response.ok || envelope.success === false) {
    const error = (payload as ApiErrorEnvelope).error;
    throw new ApiError(
      error ?? {
        code: "internal",
        message: `요청에 실패했어요 (${response.status})`,
        statusCode: response.status,
      },
    );
  }

  return envelope.data as T;
}

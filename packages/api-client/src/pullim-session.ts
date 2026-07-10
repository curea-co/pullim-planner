import {
  bootstrapCsrf,
  cookieRequest,
  type CookieHttpConfig,
} from "./cookie-http";
import { ApiError } from "./errors";

/**
 * pullim-api(통합 IdP) 세션/auth 클라이언트 — 전송계층(`cookie-http`) 위의 얇은 래퍼.
 *
 * 흡수 전환 §10 의 cutover 에서 planner FE(auth-context)가 이 클라이언트로 중앙 로그인 세션을
 * 다룬다. 토큰은 **HttpOnly 쿠키**(ADR-010)라 클라이언트가 보관하지 않는다 — 브라우저가
 * `credentials:'include'` 로 자동 첨부. 클라이언트는 **CSRF 토큰 수명만** 관리한다(double-submit).
 *
 * 계약 타입은 pullim-api DTO 의 FE 소비 뷰다(`SessionResponseDto`·`MeResponseDto`·login req).
 * 자체 BE 계약(@pullim-planner/types)과 출처가 달라 여기 co-locate 한다. PR #56(cookie-http)
 * 머지 후 `@pullim-planner/types` 로 승격은 후속 단위.
 */

/** 로그인 요청 (`POST /auth/login`). */
export interface PullimLoginRequest {
  email: string;
  password: string;
}

/**
 * 세션 발급 응답 (`POST /auth/login` = `SessionResponseDto`). 토큰은 본문에 없다 — Set-Cookie 로
 * 내려온다(access/refresh/csrf). 본문은 세션 메타만.
 */
export interface PullimSessionResponse {
  /** JWT subject(= `auth.users.id`). */
  sub: string;
  /** access 만료 시각(epoch seconds). */
  accessExpiresAt: number;
  /** 본인 동의 보류 여부(14세 미만 등). */
  selfConsentPending: boolean;
}

/**
 * planner 세션/프로필 (`GET /planner/me` = `MeResponseDto`). planner 진입 세션 확인 겸 프로필.
 * 시험정보·D-day 는 활성 플래너가 있을 때만 내려온다(없으면 생략).
 */
export interface PullimMeProfile {
  id: string;
  /** 표시명 — auth ProfileProjection 소유. 미존재 시 빈 문자열. */
  name: string;
  grade: string;
  track: string;
  /** 온보딩 전 빈 문자열. */
  school: string;
  focusSubjects: string[];
  weeklyHours: number;
  preferredStudyTime: string;
  /** KST `YYYY-MM-DD`. */
  joinedAt: string;
  streakDays: number;
  /** 활성 플래너 파생(없으면 생략). */
  examDate?: string;
  examLabel?: string;
  /** 서버 계산 D-day(KST). 활성 플래너 없으면 생략. */
  dday?: number;
}

/**
 * auth 계정 me (`GET /me` = auth `MeResponseDto` 의 FE 소비 뷰) — **owner-only**.
 * ADR-048: KCB 실명(`name`)은 이 표면에서만 본인-한정 노출(복호 실패·미인증 시 서버가
 * `displayName` 폴백으로 채워 항상 string). 로그·토큰·캐시 비탑재 대상 — 표시 용도로만 소비.
 */
export interface PullimAccountMe {
  /** 로그인 이메일(평문 PII — owner-only 표면). */
  email: string;
  /** 비PII 표시명(이메일 파생 등 — ProfileProjection 계약과 동일 값). */
  displayName: string;
  /** KCB 실명(복호, 본인-한정 — ADR-048). 미보유·복호 실패 시 displayName 폴백. */
  name: string;
}

/**
 * 학습 프로필 upsert 입력 (`PATCH /planner/me` = `UpsertMeDto`). 온보딩 입력. 전 필드 **선택**:
 * 행 없으면 생성(서버가 joinedAt/streakDays 채움), 있으면 제공한 필드만 덮어쓴다(부분 PATCH).
 */
export interface PullimProfileUpsert {
  grade?: string;
  track?: string;
  school?: string;
  focusSubjects?: string[];
  weeklyHours?: number;
  preferredStudyTime?: string;
}

export interface PullimSessionClientConfig extends CookieHttpConfig {
  /**
   * non-HttpOnly CSRF 쿠키 이름(env별). `cookie-http` 자동보강에도 쓰이고, 부트스트랩 토큰을
   * 메모리에 못 들고 있을 때 쿠키 폴백에도 쓰인다. `CookieHttpConfig.csrfCookieName` 과 동일.
   */
  csrfCookieName?: string;
}

export interface PullimSessionClient {
  /** CSRF 부트스트랩(`GET /auth/csrf`) — 토큰 수신 + 쿠키 설정. 메모리에 캐시. */
  ensureCsrf(): Promise<string>;
  /** 로그인 — CSRF 동봉 POST. 성공 시 세션 쿠키가 설정된다. */
  login(input: PullimLoginRequest): Promise<PullimSessionResponse>;
  /** 로그아웃 — CSRF 동봉 POST. 쿠키 무효화는 서버가 수행. */
  logout(): Promise<void>;
  /**
   * 세션 재발급(`POST /auth/refresh`) — refresh 쿠키로 access/refresh/CSRF 쿠키를 회전한다.
   * access 만료(401) 시 자동 재발급 경로의 실체. 이 요청 자체는 401 재시도 루프를 타지 않는다
   * (`skipRefreshRetry`). refresh 도 만료·무효면 401 → 세션 만료 확정(로그인 복구).
   */
  refresh(): Promise<PullimSessionResponse>;
  /**
   * `refresh()` 의 single-flight 래퍼 — 성공 `true`/실패 `false`. 동시 401 다발에도 재발급은
   * 1회만 나간다. 이 클라이언트 자신의 요청에는 자동 주입돼 있고(아래 팩토리 self-wire),
   * 다른 cookie-http 클라이언트(planner 데이터 클라 등)의 `config.refreshSession` 으로
   * 재사용해 앱 전체가 한 재발급 흐름을 공유하게 한다.
   */
  refreshSession(): Promise<boolean>;
  /** planner 세션 확인 — 200 프로필 / 401 미인증 / 403 엔타이틀먼트 미보유 / 404 온보딩 미완. */
  session(): Promise<PullimMeProfile>;
  /**
   * auth 계정 me (`GET /me`) — owner-only KCB 실명(`name`, ADR-048) 포함. 헤더 배지 등
   * 본인 표시 용도. 401 미인증.
   */
  accountMe(): Promise<PullimAccountMe>;
  /**
   * 학습 프로필 멱등 upsert (`PATCH /planner/me`) — 온보딩 완료. CSRF 동봉 PATCH.
   * 성공 시 갱신된 프로필(=`session()` shape). 이후 `session()` 200(404 limbo 해소).
   */
  updateProfile(input: PullimProfileUpsert): Promise<PullimMeProfile>;
}

/**
 * CSRF 거부(토큰 회전·만료) 판정 — 403 **전체가 아니라 CSRF 마커**로 좁힌다.
 *
 * pullim-api 의 CSRF 거부는 `ForbiddenException(CsrfErrors.*)` 로, 메시지가 `CSRF:` 로 시작한다
 * (`CSRF: Origin 검증 실패.`·`CSRF: double-submit 토큰 불일치.`). 자격증명 실패는 generic **401**
 * 이라 여기 안 걸리지만, 미래에 추가될 비-CSRF 403(인가·잠금 등)을 CSRF 회전으로 오인해
 * mutation 을 중복 발사하지 않도록 마커로 한정한다.
 */
function isCsrfRejection(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.statusCode === 403 &&
    /^csrf/i.test(error.message)
  );
}

/**
 * pullim-api 세션 클라이언트 팩토리. 메서드는 `this` 에 의존하지 않아 구조분해 안전.
 */
export function createPullimSessionClient(
  config: PullimSessionClientConfig,
): PullimSessionClient {
  // ── 401 자동 재발급(self-wire) ─────────────────────────────────────────────
  // 이 클라이언트의 모든 요청은 access 만료(401) 시 refreshSession(single-flight)을 거쳐
  // 1회 재시도된다(cookie-http). refresh 자체는 skipRefreshRetry 라 재진입하지 않는다.
  // 호출자가 config.refreshSession 을 명시 주입하면 그것을 우선한다.
  let refreshInFlight: Promise<boolean> | null = null;
  function refreshSession(): Promise<boolean> {
    if (!refreshInFlight) {
      refreshInFlight = doRefresh()
        .then(
          () => true,
          () => false,
        )
        .finally(() => {
          refreshInFlight = null;
        });
    }
    return refreshInFlight;
  }
  // 호출자가 config.refreshSession 을 명시 주입하면 그것이 유효 재발급 경로다 — 내부 요청과
  // 공개 API(refreshSession)가 같은 함수를 가리키도록 한 곳에서 확정한다(계약 일치).
  const effectiveRefreshSession = config.refreshSession ?? refreshSession;
  const cfg: PullimSessionClientConfig = {
    ...config,
    refreshSession: effectiveRefreshSession,
  };

  // double-submit CSRF 토큰 메모리 캐시. 부트스트랩/회전 시 갱신.
  let csrfToken: string | null = null;
  // 진행 중인 부트스트랩 공유(single-flight) — 동시 호출이 각자 GET /auth/csrf 를 쏴서
  // 토큰을 서로 덮어쓰는 race 를 막는다(auth.ts refresh single-flight 와 동형).
  let csrfInFlight: Promise<string> | null = null;

  async function ensureCsrf(): Promise<string> {
    if (csrfToken) return csrfToken;
    if (!csrfInFlight) {
      csrfInFlight = bootstrapCsrf(cfg)
        .then((token) => {
          csrfToken = token;
          return token;
        })
        .finally(() => {
          csrfInFlight = null;
        });
    }
    return csrfInFlight;
  }

  /** 상태변경 요청을 CSRF 동봉으로 보낸다. 403(토큰 무효)이면 1회 재부트스트랩 후 재시도. */
  async function mutate<T>(
    path: string,
    body?: unknown,
    method: "POST" | "PATCH" = "POST",
    skipRefreshRetry = false,
  ): Promise<T> {
    const token = await ensureCsrf();
    try {
      return await cookieRequest<T>(cfg, path, {
        method,
        body,
        csrfToken: token,
        skipRefreshRetry,
      });
    } catch (error) {
      if (!isCsrfRejection(error)) throw error;
      // 캐시 토큰이 회전·만료됐을 수 있으므로 새로 받고 1회 재시도.
      csrfToken = null;
      const fresh = await ensureCsrf();
      return await cookieRequest<T>(cfg, path, {
        method,
        body,
        csrfToken: fresh,
        skipRefreshRetry,
      });
    }
  }

  /**
   * 세션 재발급 실체 — `POST /auth/refresh`(CSRF 동봉). 재발급 자체는 401 재시도 루프
   * 금지(skipRefreshRetry) — refresh 401 = 세션 만료 확정. 서버가 CSRF 쿠키를 회전하므로
   * 성공 후 메모리 캐시를 비워 다음 mutate 가 새 토큰을 받게 한다.
   */
  async function doRefresh(): Promise<PullimSessionResponse> {
    const res = await mutate<PullimSessionResponse>(
      "/auth/refresh",
      undefined,
      "POST",
      true,
    );
    csrfToken = null;
    return res;
  }

  return {
    ensureCsrf,

    // login/logout 은 세션 쿠키를 바꾸고 서버가 **CSRF 토큰을 회전**시킨다(새 csrf 쿠키 발급).
    // 성공 후 메모리 캐시(csrfToken)를 무효화해야, 다음 상태변경 요청이 stale 토큰으로 한 번
    // 403 → 재부트스트랩 하는 회귀를 피하고 ensureCsrf 가 곧장 회전된 토큰을 받는다.
    async login(input) {
      // 로그인 401 = 자격증명 실패(자동 재발급 대상 아님) — skipRefreshRetry 로 refresh 우회.
      const res = await mutate<PullimSessionResponse>(
        "/auth/login",
        input,
        "POST",
        true,
      );
      csrfToken = null;
      return res;
    },

    async logout() {
      try {
        // logout 은 일반 재발급 경로를 탄다 — access 만료 상태에서도 refresh 후 재시도해
        // 서버 측 세션 정리(쿠키 무효화·refresh family revoke)를 끝까지 수행한다(Codex R4).
        await mutate<void>("/auth/logout");
      } finally {
        // BE 호출 성패와 무관하게 캐시를 비운다(세션/CSRF 상태 불일치 방지).
        csrfToken = null;
      }
    },

    refresh: doRefresh,

    refreshSession: effectiveRefreshSession,

    session() {
      // GET — CSRF 면제. 쿠키(access)로 인증.
      return cookieRequest<PullimMeProfile>(cfg, "/planner/me");
    },

    accountMe() {
      // GET — CSRF 면제. owner-only 실명(name, ADR-048) 포함 — 표시 용도로만 소비(로그·저장 금지).
      return cookieRequest<PullimAccountMe>(cfg, "/me");
    },

    updateProfile(input) {
      // 온보딩 프로필 멱등 upsert — CSRF 동봉 PATCH /planner/me(레포 규약상 PUT 아님).
      return mutate<PullimMeProfile>("/planner/me", input, "PATCH");
    },
  };
}

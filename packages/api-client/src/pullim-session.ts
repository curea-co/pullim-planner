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
  /** planner 세션 확인 — 200 프로필 / 401 미인증 / 403 엔타이틀먼트 미보유 / 404 온보딩 미완. */
  session(): Promise<PullimMeProfile>;
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
  // double-submit CSRF 토큰 메모리 캐시. 부트스트랩/회전 시 갱신.
  let csrfToken: string | null = null;
  // 진행 중인 부트스트랩 공유(single-flight) — 동시 호출이 각자 GET /auth/csrf 를 쏴서
  // 토큰을 서로 덮어쓰는 race 를 막는다(auth.ts refresh single-flight 와 동형).
  let csrfInFlight: Promise<string> | null = null;

  async function ensureCsrf(): Promise<string> {
    if (csrfToken) return csrfToken;
    if (!csrfInFlight) {
      csrfInFlight = bootstrapCsrf(config)
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
  ): Promise<T> {
    const token = await ensureCsrf();
    try {
      return await cookieRequest<T>(config, path, {
        method,
        body,
        csrfToken: token,
      });
    } catch (error) {
      if (!isCsrfRejection(error)) throw error;
      // 캐시 토큰이 회전·만료됐을 수 있으므로 새로 받고 1회 재시도.
      csrfToken = null;
      const fresh = await ensureCsrf();
      return await cookieRequest<T>(config, path, {
        method,
        body,
        csrfToken: fresh,
      });
    }
  }

  return {
    ensureCsrf,

    // login/logout 은 세션 쿠키를 바꾸고 서버가 **CSRF 토큰을 회전**시킨다(새 csrf 쿠키 발급).
    // 성공 후 메모리 캐시(csrfToken)를 무효화해야, 다음 상태변경 요청이 stale 토큰으로 한 번
    // 403 → 재부트스트랩 하는 회귀를 피하고 ensureCsrf 가 곧장 회전된 토큰을 받는다.
    async login(input) {
      const res = await mutate<PullimSessionResponse>("/auth/login", input);
      csrfToken = null;
      return res;
    },

    async logout() {
      try {
        await mutate<void>("/auth/logout");
      } finally {
        // BE 호출 성패와 무관하게 캐시를 비운다(세션/CSRF 상태 불일치 방지).
        csrfToken = null;
      }
    },

    session() {
      // GET — CSRF 면제. 쿠키(access)로 인증.
      return cookieRequest<PullimMeProfile>(config, "/planner/me");
    },

    updateProfile(input) {
      // 온보딩 프로필 멱등 upsert — CSRF 동봉 PATCH /planner/me(레포 규약상 PUT 아님).
      return mutate<PullimMeProfile>("/planner/me", input, "PATCH");
    },
  };
}

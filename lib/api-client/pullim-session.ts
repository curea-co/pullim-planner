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
 * pullim-api 계약 타입은 여기 co-locate 한다. PR #56(cookie-http)
 * 머지 후 공유 타입 승격은 후속 단위.
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

/**
 * 계정 엔타이틀먼트 (`GET /me/entitlements`) — 헤더 플랜 배지('기본'/'유료') 소스(QA #91).
 * `flags` = 서비스 키 → 레벨(0 없음 · 1 기본 · 2 이상 유료). 나머지 필드(grants·package·tier 등)는
 * 플래너가 소비하지 않아 선언하지 않는다(계약 확장에 영향받지 않게).
 */
export interface PullimEntitlements {
  flags: Record<string, number>;
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
   * `refresh()` 의 single-flight 래퍼 — 성공 `true`/실패 `false`(만료 확정인 401 만).
   * 동시 401 다발에도 재발급은 1회만 나간다. 이 클라이언트 자신의 요청에는 자동 주입돼
   * 있다(아래 팩토리 self-wire). 다른 cookie-http 클라이언트(planner 데이터 클라 등)는
   * 이 함수를 `config.refreshSession` 으로 주입해야 같은 재발급 흐름을 공유한다 —
   * **배선은 소비자 몫**(planner FE 주입은 후속 PR).
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
   * 계정 엔타이틀먼트 (`GET /me/entitlements`) — 헤더 플랜 배지 판정용. 401 미인증.
   * 배지 하나를 위한 부가 조회라 실패는 호출부가 삼킨다(배지 미표시).
   */
  entitlements(): Promise<PullimEntitlements>;
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
  /**
   * 마지막 재발급이 **성공한** 시각. single-flight 만으로는 못 막는 구멍을 이걸로 막는다.
   *
   * `refreshInFlight` 는 재발급이 끝나는 순간 null 로 돌아간다. 그런데 401 을 받는 시점은
   * 요청마다 다르다 — 월간 뷰는 하루당 한 번씩 블록을 받아 와서 한 화면에 **수십 개**가
   * 동시에 나가고(`use-home-blocks`), 그 응답은 몇백 ms 에 걸쳐 흩어져 도착한다. 그래서
   * 재발급이 끝난 **뒤에** 401 이 도착하는 요청이 매번 생기고, 그때마다 잠금이 비어 있으니
   * 재발급이 또 나간다. 한 화면 로드에 재발급이 **여러 번** 도는 것이 기본값이다.
   *
   * ## 그 여분의 재발급이 왜 나쁜가 — 실패해서가 아니다
   *
   * 그것들은 대개 **성공한다.** 재발급 #1 의 응답을 받은 시점에 `Set-Cookie` 가 이미
   * 적용됐으므로, 뒤이은 재발급은 회전된 **새** 토큰을 싣고 정상 통과한다. 한 탭 안에서는
   * 「이미 쓴 토큰을 재제출한다」는 일이 일어나지 않는다.
   *
   * 문제는 **성공하는 재발급 하나하나가 리프레시 토큰을 한 번씩 더 회전시킨다**는 것이다.
   * 화면 한 번 그리는 데 필요한 회전은 한 번인데 여러 번 돈다. 그리고 그 회전 하나하나가
   * **다른 탭과 충돌할 창**이다 — `refreshInFlight` 는 모듈 클로저라 탭마다 잠금이 따로인데
   * 쿠키는 하나다. 두 탭이 같은 토큰을 동시에 제출하면 늦게 도착한 쪽이 재사용으로 거부되고,
   * 그 401 이 `on401` → 세션 만료 전파로 이어진다. 회전 횟수를 줄이면 그 창도 줄어든다.
   *
   * 즉 이 변경이 확실히 없애는 것은 **불필요한 토큰 회전**이고, 교차 탭 경합은 확률을
   * 낮출 뿐 없애지 못한다. 그건 잠금을 탭 사이에서 공유해야 풀리는 별개 문제다.
   *
   * ## 창 길이 — 1초
   *
   * 덮어야 하는 것은 **한 번의 팬아웃에서 응답 도착이 흩어지는 폭**이지 토큰 수명이 아니다.
   * 수십 개가 커넥션 한도에 걸려 몇 라운드로 나뉘어도 그 폭은 수 RTT 수준이다.
   * 액세스 토큰 수명(분 단위)보다 두 자릿수 짧게 둬서, 이 창 안에서 토큰이 *진짜로* 다시
   * 만료되는 경우가 생기지 않게 한다.
   *
   * ## 성공만 캐시하고 실패는 캐시하지 않는 이유
   *
   * 실패까지 창에 넣으면 재발급 실패 폭풍도 한 번으로 줄어 얼핏 더 좋아 보인다. 그런데
   * **다른 탭이 방금 회전시켜서** 우리 재발급이 401 로 실패한 경우가 있다 — 그때 쿠키는
   * 이미 유효하므로 **뒤따르는 요청이 스스로 재발급하면 복구된다.** 실패를 캐시하면 그
   * 복구 경로가 막히고 멀쩡한 세션이 로그아웃된다. 그래서 실패는 굳히지 않는다.
   */
  let lastRefreshOkAt = 0;
  /** 재발급 직후 「쿠키가 이미 새것」이라고 볼 창. 위 「창 길이」 참조. */
  const REFRESH_REUSE_WINDOW_MS = 1_000;

  /**
   * ## 탭이 둘이면 위 장치가 통째로 무력해진다
   *
   * `refreshInFlight` 도 `lastRefreshOkAt` 도 **모듈 클로저**다 — 탭마다 따로 존재한다.
   * 그런데 쿠키는 오리진 하나를 공유한다. 그래서 두 탭이 비슷한 시각에 만료를 만나면
   * **같은 리프레시 토큰을 각자 제출**한다. 먼저 도착한 쪽이 토큰을 회전시키고, 늦게 도착한
   * 쪽은 이미 쓴 토큰을 내미는 꼴이 되어 서버의 재사용 유예를 벗어나면 거부된다.
   * 그 401 은 재발급 실패이므로 **정당한 세션 만료로 취급되어 그 탭이 로그아웃된다.**
   *
   * 한 탭 안에서 여분의 재발급이 무해했던 것과 정반대다(위 「그 여분의 재발급이 왜 나쁜가」).
   * 여기가 REUSE 가 실제로 나는 유일한 자리다. (QA 2026-09-04 N-02)
   *
   * ## 고치는 방법 — 오리진 전체가 잠금 하나를 나눠 쓴다
   *
   * **Web Locks**(`navigator.locks`)는 같은 오리진의 모든 탭·워커가 공유하는 잠금이고,
   * **탭이 죽으면 자동으로 풀린다**(직접 만든 localStorage 잠금이 못 하는 부분이다 —
   * 죽은 탭의 잠금을 누가 언제 회수할지 정해야 하고, 그 판정이 늘 틀린다).
   *
   * 잠금만으로는 부족하다. 잠금은 **동시 실행**을 막을 뿐, 뒤에 들어온 탭이 「방금 다른 탭이
   * 갱신했다」는 사실을 알려 주지는 않는다. 그래서 성공 시각을 `localStorage` 에 적어
   * 탭 사이에서 공유한다 — 잠금을 잡은 뒤 그 값을 **다시** 보고, 창 안이면 재발급을 건너뛴다.
   *
   * 즉 두 장치가 한 쌍이다: **잠금은 겹침을 막고, 공유 시각은 중복을 없앤다.**
   */
  const REFRESH_LOCK_NAME = 'pullim-auth-refresh';
  /** 공유 성공 시각 키 — 값은 epoch ms 문자열. */
  const REFRESH_STAMP_KEY = 'pullim:auth:last-refresh-ok-at';
  /**
   * 잠금 획득 대기 상한. 넘기면 **잠금 없이 진행**한다.
   *
   * 잠금을 쥔 탭의 요청이 멈춰 버리면(타임아웃 없는 fetch) 그 잠금은 탭이 죽을 때까지 안 풀린다.
   * 상한이 없으면 나머지 탭의 요청이 전부 거기 매달린다 — 교차 탭 경합을 고치려다 **교차 탭
   * 정지**를 만드는 셈이다. 상한을 넘기면 종전 동작(각자 재발급)으로 떨어뜨려, 이 변경이
   * 추가하는 최악을 「고치기 전과 같음」으로 묶는다.
   */
  const REFRESH_LOCK_TIMEOUT_MS = 10_000;

  /** 공유 시각 읽기 — 접근 불가 환경(프라이빗 모드·차단)에서는 0(모른다). */
  function readSharedRefreshAt(): number {
    try {
      const raw = globalThis.localStorage?.getItem(REFRESH_STAMP_KEY);
      return raw ? Number(raw) || 0 : 0;
    } catch {
      return 0;
    }
  }

  /** 이 탭과 다른 탭 중 **더 최근** 성공을 기준으로, 재발급이 불필요할 만큼 최근인가. */
  function refreshedRecently(): boolean {
    const age = Date.now() - Math.max(lastRefreshOkAt, readSharedRefreshAt());
    // age < 0 은 시스템 시계가 뒤로 갔거나 다른 탭의 시계가 앞선 경우다. 「최근」으로 접으면
    // 영원히 재발급을 건너뛰게 되므로 창 밖으로 본다(안전한 쪽 = 재발급을 한다).
    return age >= 0 && age < REFRESH_REUSE_WINDOW_MS;
  }

  /** 성공 시각을 이 탭과 오리진 양쪽에 남긴다. */
  function markRefreshed(): void {
    lastRefreshOkAt = Date.now();
    try {
      globalThis.localStorage?.setItem(REFRESH_STAMP_KEY, String(lastRefreshOkAt));
    } catch {
      // 쓰기 불가 — 이 탭 안에서만 창이 동작한다(종전과 동일).
    }
  }

  /** 오리진 전체에서 재발급을 직렬화한다. 잠금을 못 쓰거나 못 잡으면 그대로 실행한다. */
  async function withRefreshLock<T>(run: () => Promise<T>): Promise<T> {
    const locks = globalThis.navigator?.locks;
    // SSR·구형 브라우저 — 잠금이 없으면 종전 동작.
    if (!locks) return run();
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), REFRESH_LOCK_TIMEOUT_MS);
    try {
      return await locks.request(REFRESH_LOCK_NAME, { signal: abort.signal }, run);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error('[auth] 재발급 잠금 대기 상한 초과 — 잠금 없이 진행한다', error);
        return run();
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  function refreshSession(): Promise<boolean> {
    if (!refreshInFlight) {
      // 방금 재발급됐다면 다시 하지 않는다 — 쿠키는 이미 새것이라 재시도만 하면 통과한다.
      // 막는 것은 실패가 아니라 **불필요한 토큰 회전**이다(위 주석).
      // 여기서 이미 다른 탭의 성공까지 본다(`refreshedRecently`) — 잠금을 잡기 전에 걸러내면
      // 잠금 경합 자체가 줄어든다.
      if (refreshedRecently()) {
        return Promise.resolve(true);
      }
      refreshInFlight = withRefreshLock(async () => {
        // 잠금을 잡은 뒤 **다시** 본다. 기다리는 동안 다른 탭이 갱신했을 수 있고, 그 경우
        // 여기서 재발급하면 방금 회전된 토큰을 또 회전시켜 세 번째 탭을 밀어낸다.
        if (refreshedRecently()) return true;
        try {
          await doRefresh();
          // 창의 기준점 — **성공에만** 찍는다. 실패한 재발급은 쿠키를 갈지 못했으므로
          // 뒤따르는 요청이 재발급을 건너뛰면 안 된다. 오리진 공유 시각도 여기서 쓴다.
          markRefreshed();
          return true;
        } catch (error: unknown) {
          // refresh 자체의 401(재발급 토큰 만료·무효)만 세션 만료 확정 → false
          // (원 401 로 접혀 로그인 복구). 403(CSRF/Origin 거부)·네트워크·5xx 는 보안/
          // 인프라 오류라 만료로 오인하지 않게 그대로 전파한다(진단 정보 보존, Codex R6).
          if (error instanceof ApiError && error.statusCode === 401) {
            return false;
          }
          throw error;
        }
      }).finally(() => {
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
      // CSRF 부트스트랩은 self-wire 없는 원래 config 로 보낸다 — 공개 GET 이라 재발급이
      // 무의미하고, 배선되면 /auth/csrf 401 → refreshSession → mutate → ensureCsrf 가
      // 진행 중인 csrfInFlight(자기 자신)를 기다리는 순환 대기(hang)가 생긴다(Codex R5).
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

    entitlements() {
      // GET — CSRF 면제. 플랜 배지 판정 권위는 서버다(플래너가 자체 판정하지 않는다 — QA #91).
      return cookieRequest<PullimEntitlements>(cfg, "/me/entitlements");
    },

    updateProfile(input) {
      // 온보딩 프로필 멱등 upsert — CSRF 동봉 PATCH /planner/me(레포 규약상 PUT 아님).
      return mutate<PullimMeProfile>("/planner/me", input, "PATCH");
    },
  };
}

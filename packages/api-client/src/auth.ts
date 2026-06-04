import type {
  AuthTokens,
  AuthUser,
  CheckEmailResult,
  LoginRequest,
  SignupRequest,
  SignupResult,
} from "@pullim-planner/types";

import { ApiError } from "./errors";
import { request, type HttpConfig } from "./http";
import { nullTokenStore, type TokenStore } from "./token-store";

export interface AuthClientConfig extends HttpConfig {
  /** 토큰 저장 구현. 미주입 시 no-op (토큰 미보존 — 테스트·SSR). */
  store?: TokenStore;
  /** refresh 까지 실패해 세션이 끝났을 때 호출 (FE: 로그아웃 상태 전환·리다이렉트). */
  onSessionExpired?: () => void;
}

export interface AuthClient {
  /** 회원가입 → 토큰 저장 후 결과 반환. */
  signup(input: SignupRequest): Promise<SignupResult>;
  /** 로그인 → 토큰 저장 후 토큰 쌍 반환. */
  login(input: LoginRequest): Promise<AuthTokens>;
  /** 로그아웃 → refresh token 블랙리스트 등록 + 로컬 토큰 폐기. */
  logout(): Promise<void>;
  /** 현재 인증 사용자 조회 (access token; 401 시 refresh 1회 후 재시도). */
  me(): Promise<AuthUser>;
  /** 이메일 사용 가능 여부 (가입 폼 중복 검사). */
  checkEmail(email: string): Promise<boolean>;
  /**
   * access token 으로 보호 endpoint 를 호출한다. 401 이면 refresh 1회 후 재시도.
   * Phase δ 이후 도메인 API 클라이언트가 이 헬퍼로 인증 호출을 감싼다.
   */
  withAuth<T>(call: (accessToken: string) => Promise<T>): Promise<T>;
}

const unauthorized = () =>
  new ApiError({
    code: "unauthorized",
    message: "인증이 필요해요. 다시 로그인해주세요.",
    statusCode: 401,
  });

/**
 * auth 클라이언트 팩토리.
 *
 * 토큰 저장은 주입된 `store` 가 담당하므로 이 클라이언트는 브라우저/Node 어디서나 동작한다.
 * 반환 객체의 메서드는 `this` 에 의존하지 않아 구조분해(`const { login } = client`)해도 안전하다.
 */
export function createAuthClient(config: AuthClientConfig): AuthClient {
  const store = config.store ?? nullTokenStore;

  // 진행 중인 refresh 를 공유하기 위한 single-flight promise.
  let refreshInFlight: Promise<AuthTokens> | null = null;

  async function doRefresh(): Promise<AuthTokens> {
    const refreshToken = store.getRefreshToken();
    if (!refreshToken) throw unauthorized();
    try {
      const tokens = await request<AuthTokens>(config, "/auth/refresh", {
        method: "POST",
        bearer: refreshToken,
      });
      store.setTokens(tokens);
      return tokens;
    } catch (error) {
      // 세션 폐기는 refresh token 무효가 **확정된** 경우(401/403)로 한정한다.
      // 네트워크 단절·타임아웃·일시적 5xx(또는 transport 정규화된 statusCode 0)는 토큰이
      // 아직 살아있을 수 있으므로 세션을 유지한 채 상위로 전파한다.
      if (
        error instanceof ApiError &&
        (error.statusCode === 401 || error.statusCode === 403)
      ) {
        store.clear();
        config.onSessionExpired?.();
      }
      throw error;
    }
  }

  /**
   * refresh 를 single-flight 로 묶는다.
   *
   * 백엔드가 refresh token rotation(1회용)이라, 동시에 401 을 만난 호출들이 각자 refresh 하면
   * 첫 성공이 토큰을 소비/회전시킨 뒤 도착한 두 번째 refresh 가 401 로 실패하면서 방금 갱신한
   * 세션까지 폐기한다. 같은 시점의 재시도들이 동일한 refresh 결과를 기다리도록 promise 를 공유한다.
   */
  function refreshTokens(): Promise<AuthTokens> {
    if (!refreshInFlight) {
      refreshInFlight = doRefresh().finally(() => {
        refreshInFlight = null;
      });
    }
    return refreshInFlight;
  }

  async function withAuth<T>(
    call: (accessToken: string) => Promise<T>,
  ): Promise<T> {
    const accessToken = store.getAccessToken();
    try {
      if (!accessToken) throw unauthorized();
      return await call(accessToken);
    } catch (error) {
      if (error instanceof ApiError && error.statusCode === 401) {
        const refreshed = await refreshTokens();
        return await call(refreshed.accessToken);
      }
      throw error;
    }
  }

  return {
    async signup(input) {
      const result = await request<SignupResult>(config, "/auth/signup", {
        method: "POST",
        body: input,
      });
      store.setTokens(result);
      return result;
    },

    async login(input) {
      const tokens = await request<AuthTokens>(config, "/auth/login", {
        method: "POST",
        body: input,
      });
      store.setTokens(tokens);
      return tokens;
    },

    async logout() {
      const refreshToken = store.getRefreshToken();
      try {
        if (refreshToken) {
          await request<void>(config, "/auth/logout", {
            method: "POST",
            bearer: refreshToken,
          });
        }
      } finally {
        // BE 호출 성패와 무관하게 로컬 세션은 반드시 폐기한다.
        store.clear();
      }
    },

    me() {
      return withAuth((accessToken) =>
        request<AuthUser>(config, "/auth/me", { bearer: accessToken }),
      );
    },

    async checkEmail(email) {
      const result = await request<CheckEmailResult>(
        config,
        "/auth/check-email",
        { query: { email } },
      );
      return result.available;
    },

    withAuth,
  };
}

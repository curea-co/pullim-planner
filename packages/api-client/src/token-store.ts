import type { AuthTokens } from "@pullim-planner/types";

/**
 * 토큰 저장 추상화.
 *
 * api-client 는 실행 환경(브라우저 localStorage / SSR 쿠키 / 메모리)에 의존하지 않는다.
 * 구현은 소비자(FE auth-context)가 주입한다 — Next.js SSR/CSR 양쪽에서 안전하게 동작시키기
 * 위함.
 */
export interface TokenStore {
  getAccessToken(): string | null;
  getRefreshToken(): string | null;
  setTokens(tokens: AuthTokens): void;
  clear(): void;
}

/** 토큰을 주입하지 않을 때의 no-op 저장소 (SSR·테스트 기본값). */
export const nullTokenStore: TokenStore = {
  getAccessToken: () => null,
  getRefreshToken: () => null,
  setTokens: () => {},
  clear: () => {},
};

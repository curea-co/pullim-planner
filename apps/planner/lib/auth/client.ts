import {
  createAuthClient,
  type AuthClient,
  type TokenStore,
} from '@pullim-planner/api-client';
import type { AuthTokens } from '@pullim-planner/types';

/**
 * BE API base — 글로벌 prefix `/api` 포함 (BE `setGlobalPrefix("api")`).
 * 로컬 기본값은 NestJS dev 포트(4030). 배포 환경은 빌드 시 `NEXT_PUBLIC_API_BASE_URL` 로 주입.
 */
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4030/api';

const ACCESS_KEY = 'pullim.accessToken';
const REFRESH_KEY = 'pullim.refreshToken';

/**
 * 브라우저 localStorage 기반 TokenStore.
 *
 * SSR(서버)에서는 `window`가 없으므로 모든 접근을 no-op/`null`로 처리한다 — auth 부트스트랩과
 * 보호 가드는 클라이언트에서만 동작한다(미들웨어 가드 미사용, 스펙 §비범위).
 */
const browserTokenStore: TokenStore = {
  getAccessToken: () =>
    typeof window === 'undefined'
      ? null
      : window.localStorage.getItem(ACCESS_KEY),
  getRefreshToken: () =>
    typeof window === 'undefined'
      ? null
      : window.localStorage.getItem(REFRESH_KEY),
  setTokens: (tokens: AuthTokens) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    window.localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  },
  clear: () => {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(ACCESS_KEY);
    window.localStorage.removeItem(REFRESH_KEY);
  },
};

/**
 * 앱 전역 auth 클라이언트 싱글톤.
 *
 * `onSessionExpired`(refresh 무효 확정)는 토큰을 비운 상태에서 호출되므로, 소비자(AuthProvider)가
 * 콜백을 덮어써 unauthenticated 전환 + 리다이렉트를 처리한다.
 */
export const authClient: AuthClient = createAuthClient({
  baseUrl: API_BASE_URL,
  store: browserTokenStore,
  onSessionExpired: () => {
    sessionExpiredHandlers.forEach((handler) => handler());
  },
});

/**
 * 세션 만료 구독. AuthProvider가 마운트 시 등록하고 언마운트 시 해제한다.
 * 싱글톤 클라이언트가 React 트리 밖에 있어 콜백을 직접 주입할 수 없으므로 구독 패턴을 쓴다.
 */
const sessionExpiredHandlers = new Set<() => void>();

export function onSessionExpired(handler: () => void): () => void {
  sessionExpiredHandlers.add(handler);
  return () => sessionExpiredHandlers.delete(handler);
}

import {
  createPullimSessionClient,
  type PullimSessionClient,
} from '@/lib/api-client';

/**
 * pullim-api(통합 IdP) 세션 클라이언트 싱글톤 — 흡수 전환 §10 cutover 완료.
 *
 * `auth-context` 가 세션 복원·로그인·로그아웃·프로필 upsert 를 모두 이 클라이언트로 수행한다.
 * (자체 BE Bearer 클라이언트는 2026-07-31 폐기 — 세션/데이터 모두 pullim-api 로 일원화.)
 *
 * 동작: **쿠키 SSO** — 토큰은 HttpOnly 쿠키로 브라우저가 자동 첨부(`credentials:'include'`)하고,
 * 클라이언트는 CSRF 토큰 수명만 관리한다. pullim-api 는 URL prefix 가 없다(예: `http://localhost:3000`).
 */
const PULLIM_API_URL =
  process.env.NEXT_PUBLIC_PULLIM_API_URL ?? 'http://localhost:3000';

/** non-HttpOnly CSRF 쿠키 이름(env별: local-/dev-/prod-pullim-csrf). */
const CSRF_COOKIE_NAME =
  process.env.NEXT_PUBLIC_PULLIM_CSRF_COOKIE ?? 'local-pullim-csrf';

export const pullimSession: PullimSessionClient = createPullimSessionClient({
  baseUrl: PULLIM_API_URL,
  csrfCookieName: CSRF_COOKIE_NAME,
});

// ── pullim 쿠키 세션 만료(401) 전역 전파 ──────────────────────────────────
// 자체 BE 클라(`./client`)의 `onSessionExpired`(refresh 401 → 전역 logout) 대체. pullim 은 쿠키
// 세션이라 데이터/세션 호출이 401 을 받으면(만료·무효) 여기로 통지해 auth-context 가 상태를
// unauthenticated 로 내린다. 데이터 클라(`@/lib/planner/pullim-client`)가 401 에서 fire 한다.
type SessionExpiredListener = () => void;
const sessionExpiredListeners = new Set<SessionExpiredListener>();

/** pullim 세션 만료 전역 구독. 반환 함수로 해제. */
export function onPullimSessionExpired(
  listener: SessionExpiredListener,
): () => void {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

/** pullim 401 감지 시 호출 — 구독자에게 세션 만료를 통지한다. */
export function notifyPullimSessionExpired(): void {
  for (const listener of sessionExpiredListeners) listener();
}

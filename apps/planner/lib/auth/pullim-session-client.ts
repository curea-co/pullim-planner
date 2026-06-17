import {
  createPullimSessionClient,
  type PullimSessionClient,
} from '@pullim-planner/api-client';

/**
 * pullim-api(통합 IdP) 세션 클라이언트 싱글톤 — 흡수 전환 §10.
 *
 * 자체 BE(`./client.ts`, Bearer + localStorage)와 달리 **쿠키 SSO**다: 토큰은 HttpOnly 쿠키로
 * 브라우저가 자동 첨부(`credentials:'include'`)하고, 클라이언트는 CSRF 토큰 수명만 관리한다.
 * auth-context 가 세션 복원(`session()`=`GET /planner/me`)·로그인·로그아웃에 이걸 쓴다.
 *
 * base 는 자체 BE(`NEXT_PUBLIC_API_BASE_URL`, 글로벌 prefix `/api`)와 **분리**한다 — pullim-api 는
 * prefix 가 없다(예: `http://localhost:3000`). 데이터 클라이언트(`@/lib/planner/client`)의
 * pullim-api 이관은 후속 단위라, 지금은 auth 만 이 base 로 격리한다.
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

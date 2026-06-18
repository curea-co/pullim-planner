import {
  createPullimSessionClient,
  type PullimSessionClient,
} from '@pullim-planner/api-client';

/**
 * pullim-api(통합 IdP) 세션 클라이언트 싱글톤 — 흡수 전환 §10.
 *
 * ⚠️ **의도적 미사용(prep-only). 현재 어떤 런타임 경로도 이 클라이언트를 참조하지 않는다.**
 * dev 에서 self-BE(:4030)와 pullim-api(:3000)가 **별개 신원 저장소**이고 pullim 에 `/auth/signup`
 * 이 없어, 라이브 로그인을 pullim 쿠키 세션으로 넘기면 가입/데이터 경로가 갈라져 깨진다. 그래서
 * 라이브 cutover 는 **보류**하고(현 `auth-context` 는 자체 BE `./client.ts` 유지), 이 파일은
 * 신원 통합(흡수 §11, pullim-api 백엔드 준비) 후 **별 PR 에서 `auth-context` 배선과 함께 활성화**할
 * 쿠키 SSO 인프라로만 둔다.
 *
 * 동작(활성화 시): 자체 BE(Bearer + localStorage)와 달리 **쿠키 SSO** — 토큰은 HttpOnly 쿠키로
 * 브라우저가 자동 첨부(`credentials:'include'`)하고, 클라이언트는 CSRF 토큰 수명만 관리한다.
 * base 는 자체 BE(`NEXT_PUBLIC_API_BASE_URL`, prefix `/api`)와 **분리**한다 — pullim-api 는 prefix
 * 가 없다(예: `http://localhost:3000`).
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

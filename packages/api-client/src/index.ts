// FE → BE fetch 래퍼.
//
// auth 클라이언트(signup/login/logout/me/checkEmail) + planner 도메인 클라이언트
// (list/create/update/remove/activate/archive/unarchive/duplicate/customization).
// envelope 언랩 + 401 → refresh 1회 재시도. 토큰 저장은 주입된 `TokenStore` 가 담당한다.

export { createAuthClient } from "./auth";
export type { AuthClient, AuthClientConfig } from "./auth";
export { createPlannerClient } from "./planner";
export type { PlannerClient } from "./planner";
export { ApiError } from "./errors";
export { request } from "./http";
export type { HttpConfig, RequestOptions } from "./http";
// pullim-api(통합 IdP) 전용 쿠키/CSRF 전송 — 흡수 전환 §10. 자체 BE 호출과 분리(additive).
export { cookieRequest, bootstrapCsrf, readCsrfCookie } from "./cookie-http";
export type { CookieHttpConfig, CookieRequestOptions } from "./cookie-http";
// pullim-api 세션/auth 클라이언트 (cookie-http 위 래퍼) — 흡수 전환 §10 cutover 용.
export { createPullimSessionClient } from "./pullim-session";
export type {
  PullimSessionClient,
  PullimSessionClientConfig,
  PullimLoginRequest,
  PullimSessionResponse,
  PullimMeProfile,
} from "./pullim-session";
// pullim-api planner 도메인 데이터 클라이언트 (cookie-http 위 래퍼) — 흡수 전환 §10 cutover 용.
export { createPullimPlannerClient } from "./pullim-planner";
export type {
  PullimPlannerClient,
  PullimPlannerClientConfig,
  PullimPlanner,
  PullimPlannerWrite,
  PullimPlannerTarget,
  PullimPlannerHours,
  PullimPlannerCustomization,
  PullimBlock,
} from "./pullim-planner";
export { nullTokenStore } from "./token-store";
export type { TokenStore } from "./token-store";

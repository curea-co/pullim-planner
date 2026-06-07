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
export { nullTokenStore } from "./token-store";
export type { TokenStore } from "./token-store";

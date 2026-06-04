// FE → BE fetch 래퍼.
//
// 현재: auth 클라이언트(signup/login/logout/me/checkEmail) + envelope 언랩 +
// 401 → refresh 1회 재시도. 토큰 저장은 주입된 `TokenStore` 가 담당한다.
// 향후: Phase δ 에서 `withAuth` 위에 planner 도메인 API 함수를 추가한다.

export { createAuthClient } from "./auth";
export type { AuthClient, AuthClientConfig } from "./auth";
export { ApiError } from "./errors";
export { request } from "./http";
export type { HttpConfig, RequestOptions } from "./http";
export { nullTokenStore } from "./token-store";
export type { TokenStore } from "./token-store";

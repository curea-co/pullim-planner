// FE → pullim-api fetch 래퍼 (쿠키 SSO + CSRF).
//
// 자체 BE(Bearer + envelope) 클라이언트는 흡수 전환 §10 cutover 완료로 폐기됨 —
// 세션/데이터 모두 pullim-api(쿠키 세션)로 일원화.

export { ApiError } from "./errors";
// pullim-api(통합 IdP) 전용 쿠키/CSRF 전송 — 흡수 전환 §10.
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
  PullimAccountMe,
  PullimProfileUpsert,
} from "./pullim-session";
// pullim-api planner 도메인 데이터 클라이언트 (cookie-http 위 래퍼) — 흡수 전환 §10 cutover 용.
export {
  createPullimPlannerClient,
  weekdaysToMask,
  maskToWeekdays,
} from "./pullim-planner";
export type {
  PullimPlannerClient,
  PullimPlannerClientConfig,
  PullimPlanner,
  PullimPlannerWrite,
  PullimBlockCompletionClient,
  PullimCompletionWrite,
  PullimPlannerTarget,
  PullimPlannerHours,
  PullimPlannerCustomization,
  PullimBlock,
  PullimBurnoutFactor,
  PullimBurnoutResponse,
  PullimExamType,
  PullimBlockPattern,
  PullimMotivationStyle,
  PullimLayoutId,
  PullimWeekLayoutId,
  PullimPaletteId,
  PullimPlannerCreate,
  PullimPlannerUpdate,
  PullimPreviewBlock,
  PullimPreviewResponse,
  PullimRoutineClient,
  PullimRoutine,
  PullimRoutineWrite,
  PullimRoutinePatch,
  PullimRoutineApplication,
} from "./pullim-planner";

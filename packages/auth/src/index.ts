/**
 * @pullim-planner/auth — 인증 추상화 레이어
 *
 * pullim/packages/auth 패턴 차용. Phase β 시점에는 MockAuthProvider만 노출되며,
 * Phase η에서 실인증 (ApiAuthProvider) 추가 예정.
 *
 * ## 빠른 시작
 *
 * ```ts
 * import { authService } from "@pullim-planner/auth";
 *
 * // 기본 provider가 MockAuthProvider이므로 별도 setProvider 불필요.
 * const user = await authService.getSession(); // { id: "student_001", ... }
 * ```
 *
 * ## 커스텀 provider 주입
 *
 * ```ts
 * import { authService, MockAuthProvider } from "@pullim-planner/auth";
 *
 * authService.setProvider(new MockAuthProvider([
 *   { id: "student_002", username: "테스터" },
 * ]));
 * ```
 */
export type { AuthUser, IAuthProvider, SocialProvider } from "./types";
export { AuthError } from "./types";
export { authService } from "./service";
export { MockAuthProvider } from "./providers/mock";
export type { MockAuthUser } from "./providers/mock";

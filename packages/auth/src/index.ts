/**
 * @pullim-planner/auth — 인증 추상화 레이어
 *
 * pullim/packages/auth 패턴 차용. Phase β 시점에는 MockAuthProvider만 노출되며,
 * Phase η에서 실인증 (ApiAuthProvider) 추가 예정.
 *
 * ## 빠른 시작 (클라이언트 전용)
 *
 * ```ts
 * "use client";
 * import { authService } from "@pullim-planner/auth";
 *
 * // 전역 authService 는 브라우저 전용. 기본 provider 가 MockAuthProvider 라 곧장 사용 가능.
 * const user = await authService.getSession(); // { id: "student_001", ... }
 * ```
 *
 * ## 서버(RSC / route handler)
 *
 * 전역 `authService` 는 요청 간 상태 누수를 막기 위해 서버에서 호출 시 throw 한다.
 * 서버에서는 `headers()` 에서 직접 읽거나, 인스턴스가 필요하면 요청 단위 팩토리를 쓴다.
 *
 * ```ts
 * import { createAuthService, MockAuthProvider } from "@pullim-planner/auth";
 *
 * // 요청 핸들러 내부에서 매번 새 인스턴스 — 다른 요청과 상태 공유 안 됨.
 * const auth = createAuthService(new MockAuthProvider([{ id: "student_002" }]));
 * ```
 *
 * ## 커스텀 provider 주입 (클라이언트)
 *
 * ```ts
 * "use client";
 * import { authService, MockAuthProvider } from "@pullim-planner/auth";
 *
 * authService.setProvider(new MockAuthProvider([
 *   { id: "student_002", username: "테스터" },
 * ]));
 * ```
 */
export type { AuthUser, IAuthProvider, SocialProvider } from "./types";
export { AuthError } from "./types";
export { authService, AuthService, createAuthService } from "./service";
export { MockAuthProvider, DEFAULT_MOCK_CREDENTIALS } from "./providers/mock";
export type { MockAuthUser } from "./providers/mock";

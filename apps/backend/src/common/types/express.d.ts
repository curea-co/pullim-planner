import type { AuthUser } from "../../entities/auth-user.entity";

declare global {
  namespace Express {
    /**
     * `JwtStrategy.validate()` 가 `request.user` 에 주입하는 인증 사용자.
     * Phase 0 부터 `AuthUser` 엔티티 전체(id/email/role/...)가 주입된다.
     *
     * `/auth/refresh` 경로는 `JwtRefreshStrategy` 가 `{ user, refreshToken }` 를
     * 주입하므로, 그 핸들러만 `@CurrentUser()` 반환을 해당 래퍼 타입으로 받는다.
     */
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends AuthUser {}

    interface Request {
      /** 인증 사용자. `@CurrentUser()` / `getCurrentUserId()` 로 접근한다. */
      user?: User;
    }
  }
}

export {};

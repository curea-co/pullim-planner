import type { AuthenticatedUser } from "../decorators/current-user.decorator";

declare global {
  namespace Express {
    /**
     * MockAuthGuard가 주입하는 사용자 정보.
     * Phase β: `{ id: string }`. 향후 실인증 도입 시 role/email 등 확장.
     */
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface User extends AuthenticatedUser {}

    interface Request {
      /**
       * MockAuthGuard가 주입하는 사용자 정보.
       * `@CurrentUser()` 데코레이터를 통해 컨트롤러에서 접근한다.
       */
      user?: User;
    }
  }
}

export {};

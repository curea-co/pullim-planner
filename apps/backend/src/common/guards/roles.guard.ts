import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { ErrorMessages } from "../constants/error-messages.constant";
import { ROLES_KEY } from "../decorators/roles.decorator";

/**
 * 역할 기반 접근 제어 가드.
 *
 * pullim 본체의 `RolesGuard` 패턴을 차용하되 planner 단일 사용자 모델에서는 role 모델이
 * 아직 없다. `@Roles()` 데코레이터가 없는 라우트는 통과시키지만, `@Roles()`가 붙은
 * 라우트는 **fail-closed**로 막아둔다 — 추후 컨트롤러에서 `@Roles()`를 추가했을 때
 * 보호된 줄 알고 배포하는 함정을 방지한다.
 *
 * Phase η 실인증 도입 후 `request.user.role` 검사 로직으로 전환한다.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) return true;

    // Phase β: role 모델 미구현 — `@Roles()`가 붙은 라우트는 fail-closed.
    // Phase η 실인증 도입 후 `request.user.role`과 requiredRoles 교차 검사로 교체.
    throw new ForbiddenException({
      code: ErrorMessages.AUTH_FORBIDDEN.code,
      message: ErrorMessages.AUTH_FORBIDDEN.message,
    });
  }
}

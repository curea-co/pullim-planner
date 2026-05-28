import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

import { ROLES_KEY } from "../decorators/roles.decorator";

/**
 * 역할 기반 접근 제어 가드.
 *
 * pullim 본체의 `RolesGuard` 패턴을 차용하되 planner 단일 사용자 모델에서는 사실상
 * 비활성이다 — `@Roles()` 데코레이터가 없는 라우트는 모두 통과한다.
 *
 * 향후 도메인 분화 시 (admin, teacher 등) 본 가드가 실제 검사를 수행하도록 확장한다.
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

    // Phase β: planner 단일 사용자 모델이므로 role 검사 미적용 — 항상 통과.
    // Phase η 실인증 도입 후 `request.user.role` 검사로 전환.
    return true;
  }
}

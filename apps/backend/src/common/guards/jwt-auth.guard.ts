import { type ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";

import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

/**
 * 전역 JWT 인증 가드. Passport `JwtStrategy('jwt')` 에 access token 검증을 위임한다.
 * `@Public()` 데코레이터가 적용된 핸들러는 인증을 건너뛴다 (req.user 미주입).
 *
 * #36 의 `MockAuthGuard` 를 대체한다 (app.module 글로벌 가드 교체).
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}

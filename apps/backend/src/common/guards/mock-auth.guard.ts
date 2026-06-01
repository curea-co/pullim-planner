import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Request } from "express";

import {
  DEFAULT_MOCK_USER_ID,
  MOCK_USER_HEADER,
} from "../constants/auth.constant";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

/**
 * Mock 헤더 인증 가드.
 *
 * pullim 본체의 `JwtAuthGuard`(Passport jwt) 패턴을 차용하되 실인증 대신
 * `X-User-Id` 헤더만으로 사용자를 식별한다.
 *
 * - 헤더가 있으면 해당 user-id를 request.user에 주입
 * - 헤더가 없으면 fallback {@link DEFAULT_MOCK_USER_ID} 주입
 * - `@Public()` 데코레이터가 적용된 핸들러는 user 주입을 건너뛴다
 *
 * Phase η에서 실인증 도입 시 본 가드 → `JwtAuthGuard` 교체. controller·decorator
 * 사용처(@CurrentUser)는 시그니처 호환이라 변경 불필요.
 */
@Injectable()
export class MockAuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * 요청 헤더에서 user-id를 추출해 `request.user`에 주입한다.
   * @param context - NestJS 실행 컨텍스트
   * @returns 항상 true (Mock 검증은 통과 허용, 실인증 도입 후 분기)
   */
  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const rawHeader = request.headers[MOCK_USER_HEADER];
    const userId =
      typeof rawHeader === "string" && rawHeader.trim().length > 0
        ? rawHeader.trim()
        : Array.isArray(rawHeader) && rawHeader[0]
          ? rawHeader[0]
          : DEFAULT_MOCK_USER_ID;

    // 스모크 모드 전용 stand-in. `Express.User` 는 auth 활성 시 `AuthUser` 전체이지만,
    // DB·엔티티가 없는 Phase β 스모크에서는 `/whoami` 가 id 만 쓰므로 부분 객체를 주입한다.
    // (auth 활성 경로에서는 JwtStrategy 가 AuthUser 전체를 주입하므로 이 가드는 비활성)
    request.user = { id: userId } as Express.User;
    return true;
  }
}

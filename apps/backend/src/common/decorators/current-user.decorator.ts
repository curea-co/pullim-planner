import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";

/**
 * 현재 인증된 사용자 정보를 컨트롤러 핸들러에 주입한다.
 * MockAuthGuard가 `request.user`에 주입한 {@link AuthenticatedUser} 객체를 반환한다.
 *
 * Phase β 시점에는 `{ id: string }` 단순 객체.
 *
 * @example
 * ```ts
 * @Get('me')
 * getMe(@CurrentUser() user: AuthenticatedUser) {
 *   return user;
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  // data: 데코레이터 호출 시 전달되는 인자 (e.g. @CurrentUser('id')). 현재 미사용
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user;
  },
);

/**
 * Mock 인증으로 주입되는 사용자 정보.
 * pullim 본체의 JwtPayload와 달리 Phase β에서는 id 만 보유한다.
 * 향후 실인증 도입 시 role, email 등이 추가된다.
 */
export interface AuthenticatedUser {
  id: string;
}

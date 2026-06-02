import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Request } from "express";

/**
 * 현재 인증된 사용자 정보를 컨트롤러 핸들러에 주입한다.
 *
 * `JwtStrategy.validate()` 가 `request.user` 에 주입한 `AuthUser` 엔티티를 반환한다
 * (access token 경로). `JwtRefreshStrategy` 경로에서는 `{ user, refreshToken }` 형태가
 * 주입되므로 호출부에서 해당 타입으로 받는다.
 *
 * @example
 * ```ts
 * @Get('me')
 * me(@CurrentUser() user: AuthUser) { return MeResponseDto.from(user); }
 * ```
 */
export const CurrentUser = createParamDecorator(
  // data: @CurrentUser('id') 형태 인자. 현재 미사용.
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user;
  },
);

/**
 * 인증 주체의 최소 식별 형태. `request.user` 에 주입되는 `AuthUser` 가 이를 만족한다.
 * `getCurrentUserId()` resolver 와 도메인 통합(Phase 1)이 의존한다.
 */
export interface AuthenticatedUser {
  id: string;
}

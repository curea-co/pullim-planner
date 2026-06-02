import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import type { Request } from "express";
import { ExtractJwt, Strategy } from "passport-jwt";

import jwtConfig from "../../config/jwt.config";
import type { AuthUser } from "../../entities/auth-user.entity";
import { AuthUserService } from "../../modules/auth/service/auth-user.service";
import { JWT_TYPE_REFRESH } from "../constants/jwt.constant";
import { ErrorMessages } from "../constants/error-messages.constant";

/**
 * Refresh Token 검증 전략 (`'jwt-refresh'`). `/auth/refresh` 전용 `JwtRefreshGuard` 가
 * 위임한다. 원본 토큰을 함께 반환해 use-case 가 rotation 블랙리스트 등록에 쓸 수 있게 한다.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  "jwt-refresh",
) {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly jwt: ConfigType<typeof jwtConfig>,
    private readonly authUserService: AuthUserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwt.secret,
      passReqToCallback: true,
    });
  }

  /**
   * Refresh Token 페이로드를 검증하고 DB 에서 사용자를 조회한다.
   * @param req - HTTP 요청 (원본 토큰 재추출용)
   * @param payload - JWT 디코딩 페이로드
   * @returns { user, refreshToken }
   * @throws {UnauthorizedException} 토큰 타입 불일치/토큰 없음/사용자 없음/구토큰
   */
  async validate(
    req: Request,
    payload: { sub: string; type?: string; iat?: number },
  ): Promise<{ user: AuthUser; refreshToken: string }> {
    // type 클레임을 **필수**로 강제한다. 누락/불일치(특히 access 토큰)를 모두 거절해
    // access 토큰을 refresh 로 오용하는 것을 차단한다 (codex #40 round-2).
    if (payload.type !== JWT_TYPE_REFRESH) {
      throw new UnauthorizedException(ErrorMessages.AUTH_INVALID_TOKEN);
    }

    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (!token) {
      throw new UnauthorizedException(ErrorMessages.AUTH_INVALID_TOKEN);
    }

    const user = await this.authUserService.findByIdOrFail(payload.sub);

    if (user.passwordChangedAt && payload.iat !== undefined) {
      const changedSecond = Math.floor(
        user.passwordChangedAt.toMillis() / 1000,
      );
      if (payload.iat <= changedSecond) {
        throw new UnauthorizedException(ErrorMessages.AUTH_INVALID_TOKEN);
      }
    }

    return { user, refreshToken: token };
  }
}

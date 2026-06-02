import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";

import jwtConfig from "../../config/jwt.config";
import type { AuthUser } from "../../entities/auth-user.entity";
import { AuthUserService } from "../../modules/auth/service/auth-user.service";
import { JWT_TYPE_ACCESS } from "../constants/jwt.constant";
import { ErrorMessages } from "../constants/error-messages.constant";

/**
 * Access Token 검증 전략 (`'jwt'`). 전역 `JwtAuthGuard` 가 위임한다.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly jwt: ConfigType<typeof jwtConfig>,
    private readonly authUserService: AuthUserService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwt.secret,
    });
  }

  /**
   * Access Token 페이로드를 검증하고 DB 에서 사용자를 조회해 반환한다.
   * refresh 타입 토큰은 access guard 를 통과하지 못하게 차단하고, 비밀번호 변경
   * 이전에 발급된 토큰은 무효화한다 (세션 무효화).
   * @param payload - JWT 디코딩 페이로드
   * @returns request.user 에 주입될 AuthUser 엔티티
   * @throws {UnauthorizedException} 토큰 타입 불일치/사용자 없음/구토큰
   */
  async validate(payload: {
    sub: string;
    type?: string;
    iat?: number;
  }): Promise<AuthUser> {
    // type 클레임을 **필수**로 강제한다. 누락/불일치(특히 refresh 토큰)를 모두 거절해
    // refresh 토큰을 access 로 replay 하는 것을 차단한다 (codex #40 round-2).
    if (payload.type !== JWT_TYPE_ACCESS) {
      throw new UnauthorizedException(ErrorMessages.AUTH_INVALID_TOKEN);
    }

    const user = await this.authUserService.findByIdOrFail(payload.sub);

    // 비밀번호 변경 이전 발급 토큰 무효화. planner BaseModel 은 Luxon DateTime 이므로
    // `.toMillis()` 로 epoch ms 를 얻은 뒤 초 단위로 비교한다 (Q 의 Date.getTime() 대응).
    if (user.passwordChangedAt && payload.iat !== undefined) {
      const changedSecond = Math.floor(
        user.passwordChangedAt.toMillis() / 1000,
      );
      if (payload.iat <= changedSecond) {
        throw new UnauthorizedException(ErrorMessages.AUTH_INVALID_TOKEN);
      }
    }

    return user;
  }
}

import { randomUUID } from "node:crypto";

import { Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";

import jwtConfig from "../../config/jwt.config";
import type { AuthUser } from "../../entities/auth-user.entity";
import { JWT_TYPE_ACCESS, JWT_TYPE_REFRESH } from "../constants/jwt.constant";
import { TokenProvider } from "../interfaces/token-provider.interface";

/**
 * Passport/JWT 기반 토큰 발급기.
 * access 페이로드: { sub, email, role, type:'access', jti }
 * refresh 페이로드: { sub, type:'refresh', jti }
 * jti 는 블랙리스트(rotation) 단위 식별자다.
 */
@Injectable()
export class PassportTokenProvider extends TokenProvider {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwt: ConfigType<typeof jwtConfig>,
  ) {
    super();
  }

  /**
   * Access Token + Refresh Token 쌍을 생성한다.
   * @param user - 토큰을 발급할 AuthUser 엔티티
   * @returns accessToken, refreshToken 쌍
   */
  generateTokens(user: AuthUser): {
    accessToken: string;
    refreshToken: string;
  } {
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
        type: JWT_TYPE_ACCESS,
        jti: randomUUID(),
      },
      { expiresIn: this.jwt.expiration },
    );

    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: JWT_TYPE_REFRESH, jti: randomUUID() },
      { expiresIn: this.jwt.refreshExpiration },
    );

    return { accessToken, refreshToken };
  }
}

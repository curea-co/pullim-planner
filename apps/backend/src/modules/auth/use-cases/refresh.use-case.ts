import { Injectable } from "@nestjs/common";

import { AuthUser } from "../../../entities/auth-user.entity";
import { AuthService } from "../service/auth.service";

/**
 * Refresh Token 으로 새 토큰 쌍을 발급하는 UseCase. 사용된 Refresh Token 을
 * 원자적으로 블랙리스트에 등록(rotation)해 동시 재사용을 차단한다.
 */
@Injectable()
export class RefreshUseCase {
  constructor(private readonly authService: AuthService) {}

  /**
   * Refresh Token 으로 새 토큰 쌍을 발급한다.
   * @param user - 토큰 갱신 대상 AuthUser
   * @param oldRefreshToken - 사용된 Refresh Token
   * @returns accessToken, refreshToken 쌍
   * @throws {UnauthorizedException} 토큰이 이미 블랙리스트에 등록된 경우
   */
  async execute(
    user: AuthUser,
    oldRefreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    await this.authService.consumeRefreshTokenOrFail(oldRefreshToken);
    return this.authService.generateTokens(user);
  }
}

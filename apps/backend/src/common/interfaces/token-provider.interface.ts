import type { AuthUser } from "../../entities/auth-user.entity";

/** 토큰 발급 추상화. DI 토큰으로도 사용한다. (구현체: PassportTokenProvider) */
export abstract class TokenProvider {
  /**
   * Access Token + Refresh Token 쌍을 생성한다.
   * @param user - 토큰을 발급할 AuthUser 엔티티
   * @returns accessToken, refreshToken 쌍
   */
  abstract generateTokens(user: AuthUser): {
    accessToken: string;
    refreshToken: string;
  };
}

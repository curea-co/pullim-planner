import {
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

import { ErrorMessages } from "../../../common/constants/error-messages.constant";
import { MAX_LOGIN_ATTEMPTS } from "../../../common/constants/security.constant";
import { TokenProvider } from "../../../common/interfaces/token-provider.interface";
import { hashText, verifyHash } from "../../../common/utils/crypto.util";
import { extractTokenIdAndExpiry } from "../../../common/utils/token.util";
import { AuthUser } from "../../../entities/auth-user.entity";
import {
  AuthProvider,
  AuthUserProvider,
} from "../../../entities/auth-user-provider.entity";
import { BlacklistRepositoryInterface } from "../interface/blacklist-repository.interface";

/**
 * 인증 핵심 서비스. 비밀번호 해시/검증, 토큰 발급, Refresh Token 블랙리스트(rotation)를
 * 담당한다. 예외는 본 서비스 레이어에서만 throw 한다. 본체 pullim AuthService 정렬.
 */
@Injectable()
export class AuthService {
  private readonly pepper: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly tokenProvider: TokenProvider,
    @Inject(BlacklistRepositoryInterface)
    private readonly blacklistRepository: BlacklistRepositoryInterface,
  ) {
    this.pepper = this.configService.getOrThrow<string>("PASSWORD_PEPPER");
  }

  /**
   * 평문 비밀번호를 해시한다.
   * @param plainPassword - 평문 비밀번호
   * @returns bcrypt 해시 (pepper 적용)
   */
  async hashPassword(plainPassword: string): Promise<string> {
    return hashText(plainPassword, this.pepper);
  }

  /**
   * 이메일 로그인용 사용자와 EMAIL 제공자를 검증해 반환한다.
   * 계정 열거 방지를 위해 사용자/제공자 부재 모두 동일한 401 메시지를 쓴다.
   * @param user - authProviders 가 로드된 AuthUser (null 가능)
   * @returns user 와 emailProvider
   * @throws {UnauthorizedException} 사용자 없음 또는 EMAIL 제공자 없음
   */
  findEmailLoginUserOrFail(user: AuthUser | null): {
    user: AuthUser;
    emailProvider: AuthUserProvider;
  } {
    if (!user) {
      throw new UnauthorizedException(ErrorMessages.AUTH_LOGIN_FAILED);
    }
    const emailProvider = user.authProviders?.find(
      (provider) => provider.provider === AuthProvider.EMAIL,
    );
    if (!emailProvider) {
      throw new UnauthorizedException(ErrorMessages.AUTH_LOGIN_FAILED);
    }
    return { user, emailProvider };
  }

  /**
   * 로그인 사전 조건(계정 잠금)을 검증한다.
   * @param emailProvider - EMAIL 제공자
   * @throws {ForbiddenException} 계정이 잠긴 경우
   */
  validateLoginPreConditions(emailProvider: AuthUserProvider): void {
    if (emailProvider.lockedAt) {
      throw new ForbiddenException(ErrorMessages.AUTH_ACCOUNT_LOCKED);
    }
  }

  /**
   * 비밀번호 일치 여부를 반환한다 (예외 없음).
   * @param emailProvider - EMAIL 제공자
   * @param password - 입력 비밀번호
   * @returns 일치 여부
   */
  async isPasswordMatch(
    emailProvider: AuthUserProvider,
    password: string,
  ): Promise<boolean> {
    if (!emailProvider.password) return false;
    return verifyHash(password, emailProvider.password, this.pepper);
  }

  /**
   * 비밀번호를 검증하고 불일치 시 예외를 던진다. 한계 도달 시 잠금 예외.
   * @param emailProvider - EMAIL 제공자
   * @param password - 입력 비밀번호
   * @throws {UnauthorizedException} 비밀번호 불일치
   * @throws {ForbiddenException} 실패 한계 도달 시 잠금
   */
  async verifyPasswordOrFail(
    emailProvider: AuthUserProvider,
    password: string,
  ): Promise<void> {
    if (await this.isPasswordMatch(emailProvider, password)) return;

    if (emailProvider.failedLoginCount + 1 >= MAX_LOGIN_ATTEMPTS) {
      throw new ForbiddenException(ErrorMessages.AUTH_ACCOUNT_LOCKED);
    }
    throw new UnauthorizedException(ErrorMessages.AUTH_LOGIN_FAILED);
  }

  /**
   * Access + Refresh Token 쌍을 발급한다.
   * @param user - 토큰을 발급할 AuthUser
   * @returns accessToken, refreshToken 쌍
   */
  generateTokens(user: AuthUser): {
    accessToken: string;
    refreshToken: string;
  } {
    return this.tokenProvider.generateTokens(user);
  }

  /**
   * Refresh Token 을 블랙리스트에 등록한다 (로그아웃). 이미 등록돼 있어도 무시한다.
   * @param refreshToken - 블랙리스트에 등록할 Refresh Token
   */
  async blacklistToken(refreshToken: string): Promise<void> {
    const { tokenId, expiresAt } = extractTokenIdAndExpiry(refreshToken);
    await this.blacklistRepository.add(tokenId, expiresAt);
  }

  /**
   * Refresh Token 을 원자적으로 소비(블랙리스트 등록)한다. 이미 사용된 토큰이면
   * 예외를 던진다 — Refresh Rotation 동시 재사용 차단.
   * @param refreshToken - 사용된 Refresh Token
   * @throws {UnauthorizedException} 이미 블랙리스트에 등록된 토큰인 경우
   */
  async consumeRefreshTokenOrFail(refreshToken: string): Promise<void> {
    const { tokenId, expiresAt } = extractTokenIdAndExpiry(refreshToken);
    const wasNew = await this.blacklistRepository.add(tokenId, expiresAt);
    if (!wasNew) {
      throw new UnauthorizedException(ErrorMessages.AUTH_TOKEN_BLACKLISTED);
    }
  }
}

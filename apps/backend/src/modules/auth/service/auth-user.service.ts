import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { type EntityManager } from "typeorm";

import { ErrorMessages } from "../../../common/constants/error-messages.constant";
import { AuthUser } from "../../../entities/auth-user.entity";
import { AuthProvider } from "../../../entities/enums/auth-provider.enum";
import { AuthUserRepositoryInterface } from "../interface/auth-user-repository.interface";

/**
 * 인증 사용자(AuthUser) 도메인 서비스. 사용자 조회/생성/이메일 검증 및 로그인 실패
 * 카운트 관리를 담당한다. 예외는 본 서비스 레이어에서만 throw 한다.
 */
@Injectable()
export class AuthUserService {
  constructor(
    private readonly authUserRepository: AuthUserRepositoryInterface,
  ) {}

  /**
   * id 로 사용자를 조회한다. 없으면 401 을 던진다.
   * @param id - 사용자 UUID
   * @returns AuthUser
   * @throws {UnauthorizedException} 사용자가 없는 경우
   */
  async findByIdOrFail(id: string): Promise<AuthUser> {
    const user = await this.authUserRepository.findById(id);
    if (!user) {
      throw new UnauthorizedException(ErrorMessages.AUTH_UNAUTHORIZED);
    }
    return user;
  }

  /**
   * 이메일로 사용자를 조회한다 (authProviders 포함).
   * @param email - 이메일
   * @returns AuthUser 또는 null
   */
  async findByEmailWithProviders(email: string): Promise<AuthUser | null> {
    return this.authUserRepository.findByEmailWithProviders(email);
  }

  /**
   * 이메일 사용 가능 여부를 반환한다.
   * @param email - 이메일
   * @returns 사용 가능 여부
   */
  async isEmailAvailable(email: string): Promise<boolean> {
    return !(await this.authUserRepository.existsByEmail(email));
  }

  /**
   * 이메일 중복을 검증한다. 중복이면 409 를 던진다.
   * @param email - 이메일
   * @throws {ConflictException} 이미 존재하는 이메일인 경우
   */
  async validateEmailUniqueness(email: string): Promise<void> {
    if (await this.authUserRepository.existsByEmail(email)) {
      throw new ConflictException(ErrorMessages.USER_EMAIL_DUPLICATED);
    }
  }

  /**
   * 이메일 사용자와 EMAIL 제공자를 생성한다.
   * @param params - name·email·passwordHash·marketingConsent
   * @param manager - 트랜잭션 매니저
   * @returns 저장된 AuthUser
   */
  async createWithEmailProvider(
    params: {
      name: string;
      email: string;
      passwordHash: string;
      marketingConsent?: boolean;
    },
    manager: EntityManager,
  ): Promise<AuthUser> {
    return this.authUserRepository.createWithEmailProvider(params, manager);
  }

  /**
   * 로그인 실패 횟수를 원자적으로 증가시킨다 (한계 도달 시 잠금).
   * @param userId - 사용자 UUID
   * @param maxAttempts - 잠금 임계치
   */
  async incrementFailedLoginCount(
    userId: string,
    maxAttempts: number,
  ): Promise<void> {
    await this.authUserRepository.incrementFailedLoginCount(
      userId,
      AuthProvider.EMAIL,
      maxAttempts,
    );
  }

  /**
   * 로그인 성공 시 실패 횟수를 초기화한다.
   * @param userId - 사용자 UUID
   */
  async resetFailedLoginCount(userId: string): Promise<void> {
    await this.authUserRepository.resetFailedLoginCount(
      userId,
      AuthProvider.EMAIL,
    );
  }
}

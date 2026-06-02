import type { EntityManager } from "typeorm";

import type { AuthUser } from "../../../entities/auth-user.entity";
import type { AuthProvider } from "../../../entities/enums/auth-provider.enum";

/** AuthUser/AuthUserProvider DB 접근 추상화. DI 토큰으로도 사용한다. */
export abstract class AuthUserRepositoryInterface {
  /**
   * id 로 사용자를 조회한다.
   * @param id - 사용자 UUID
   * @returns AuthUser 또는 null
   */
  abstract findById(id: string): Promise<AuthUser | null>;

  /**
   * 이메일로 사용자를 조회한다. authProviders 를 함께 로드한다.
   * @param email - 이메일
   * @returns AuthUser(authProviders 포함) 또는 null
   */
  abstract findByEmailWithProviders(email: string): Promise<AuthUser | null>;

  /**
   * 이메일 존재 여부를 확인한다 (살아있는 행 기준).
   * @param email - 이메일
   * @returns 존재 여부
   */
  abstract existsByEmail(email: string): Promise<boolean>;

  /**
   * 사용자와 EMAIL 제공자를 한 트랜잭션에서 생성한다.
   * @param params - 사용자 정보와 해시된 비밀번호
   * @param manager - 트랜잭션 매니저
   * @returns 저장된 AuthUser
   */
  abstract createWithEmailProvider(
    params: {
      name: string;
      email: string;
      passwordHash: string;
      marketingConsent?: boolean;
    },
    manager: EntityManager,
  ): Promise<AuthUser>;

  /**
   * 특정 사용자의 실패 횟수를 원자적으로 증가시키고, 한계 도달 시 잠근다.
   * @param userId - 사용자 UUID
   * @param provider - 인증 제공자
   * @param maxAttempts - 잠금 임계치
   */
  abstract incrementFailedLoginCount(
    userId: string,
    provider: AuthProvider,
    maxAttempts: number,
  ): Promise<void>;

  /**
   * 특정 사용자의 실패 횟수를 0 으로 초기화한다 (잠금 상태가 아닐 때만).
   * @param userId - 사용자 UUID
   * @param provider - 인증 제공자
   */
  abstract resetFailedLoginCount(
    userId: string,
    provider: AuthProvider,
  ): Promise<void>;
}

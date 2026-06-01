import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { type EntityManager, type Repository } from "typeorm";

import { AuthUser } from "../../../entities/auth-user.entity";
import { AuthUserProvider } from "../../../entities/auth-user-provider.entity";
import { AuthProvider } from "../../../entities/enums/auth-provider.enum";
import { AuthUserRepositoryInterface } from "../interface/auth-user-repository.interface";

@Injectable()
export class AuthUserRepository extends AuthUserRepositoryInterface {
  constructor(
    @InjectRepository(AuthUser)
    private readonly userRepo: Repository<AuthUser>,
    @InjectRepository(AuthUserProvider)
    private readonly providerRepo: Repository<AuthUserProvider>,
  ) {
    super();
  }

  async findById(id: string): Promise<AuthUser | null> {
    return this.userRepo.findOne({ where: { id } });
  }

  async findByEmailWithProviders(email: string): Promise<AuthUser | null> {
    return this.userRepo.findOne({
      where: { email },
      relations: { authProviders: true },
    });
  }

  async existsByEmail(email: string): Promise<boolean> {
    // BaseModel 의 @DeleteDateColumn 덕분에 soft delete 된 행은 자동 제외된다.
    return this.userRepo.existsBy({ email });
  }

  async createWithEmailProvider(
    params: {
      name: string;
      email: string;
      passwordHash: string;
      marketingConsent?: boolean;
    },
    manager: EntityManager,
  ): Promise<AuthUser> {
    const user = AuthUser.create({
      name: params.name,
      email: params.email,
      marketingConsent: params.marketingConsent,
    });
    const savedUser = await manager.save(user);

    const provider = AuthUserProvider.create({
      provider: AuthProvider.EMAIL,
      providerId: params.email,
      password: params.passwordHash,
      user: savedUser,
    });
    await manager.save(provider);

    return savedUser;
  }

  async incrementFailedLoginCount(
    userId: string,
    provider: AuthProvider,
    maxAttempts: number,
  ): Promise<void> {
    // DB atomic increment 로 동시성 안전 보장. 한계 도달 시 locked_at 설정.
    await this.providerRepo
      .createQueryBuilder()
      .update(AuthUserProvider)
      .set({
        failedLoginCount: () => "failed_login_count + 1",
        lockedAt: () =>
          `CASE WHEN failed_login_count + 1 >= ${maxAttempts} THEN now() ELSE locked_at END`,
      })
      .where("user_id = :userId AND provider = :provider", { userId, provider })
      .execute();
  }

  async resetFailedLoginCount(
    userId: string,
    provider: AuthProvider,
  ): Promise<void> {
    // 잠금된 계정은 초기화하지 않는다 — 잠금 해제는 비밀번호 재설정 경로(향후)로만.
    await this.providerRepo
      .createQueryBuilder()
      .update(AuthUserProvider)
      .set({ failedLoginCount: 0 })
      .where(
        "user_id = :userId AND provider = :provider AND locked_at IS NULL",
        { userId, provider },
      )
      .execute();
  }
}

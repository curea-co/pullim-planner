import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { type Repository } from "typeorm";

import { RefreshTokenBlacklist } from "../../../entities/refresh-token-blacklist.entity";
import { BlacklistRepositoryInterface } from "../interface/blacklist-repository.interface";

@Injectable()
export class BlacklistRepository extends BlacklistRepositoryInterface {
  constructor(
    @InjectRepository(RefreshTokenBlacklist)
    private readonly repo: Repository<RefreshTokenBlacklist>,
  ) {
    super();
  }

  async add(tokenId: string, expiresAt: Date): Promise<boolean> {
    // ON CONFLICT DO NOTHING 으로 원자적 INSERT.
    // `RETURNING token_id` 를 명시해야 신규 insert 시 result.raw 에 행이 담긴다.
    // returning 없이는 Postgres 에서 raw 가 항상 빈 배열이라 신규/중복 판별이 불가능해
    // consumeRefreshTokenOrFail 이 모든 refresh 를 재사용으로 오판, /auth/refresh 가 상시
    // 실패했다 (codex #40). 중복(=토큰 재사용)이면 ON CONFLICT 로 행이 안 들어가 raw 가
    // 비어 false 가 된다.
    const result = await this.repo
      .createQueryBuilder()
      .insert()
      .into(RefreshTokenBlacklist)
      .values({ tokenId, expiresAt })
      .orIgnore()
      .returning("token_id")
      .execute();
    return (result.raw as unknown[]).length > 0;
  }

  async exists(tokenId: string): Promise<boolean> {
    return this.repo.existsBy({ tokenId });
  }
}

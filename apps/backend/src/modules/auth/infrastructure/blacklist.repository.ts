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
    // ON CONFLICT DO NOTHING 으로 원자적 INSERT. 중복(=재사용)이면 RETURNING 행이 없다.
    const result = await this.repo
      .createQueryBuilder()
      .insert()
      .into(RefreshTokenBlacklist)
      .values({ tokenId, expiresAt })
      .orIgnore()
      .execute();
    return (result.raw as unknown[]).length > 0;
  }

  async exists(tokenId: string): Promise<boolean> {
    return this.repo.existsBy({ tokenId });
  }
}

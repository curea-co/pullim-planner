import { Column, Entity, Index, PrimaryColumn } from "typeorm";

/**
 * Refresh Token 블랙리스트.
 *
 * 본체 pullim 은 Redis 를 쓰지만 planner 는 Redis 인프라가 없어 Postgres 테이블로
 * 대체한다 (Q/classbot 동일 결정). tokenId(jti)를 PK 로 두어 원자적 INSERT(ON CONFLICT
 * DO NOTHING)로 중복 소비(Refresh Rotation 재사용)를 차단한다. expiresAt 경과분은 lazy 정리.
 *
 * BaseModel 을 상속하지 않는다 — uuid PK·soft delete 가 불필요하고, PK 가 jti 여야 한다.
 */
@Entity("refresh_token_blacklist")
export class RefreshTokenBlacklist {
  @PrimaryColumn({ type: "varchar", length: 128, comment: "토큰 ID (jti)" })
  tokenId: string;

  @Index("idx_refresh_blacklist_expires_at")
  @Column({ type: "timestamptz", comment: "토큰 만료 시각 (정리 기준)" })
  expiresAt: Date;

  @Column({ type: "timestamptz", default: () => "now()", comment: "등록 시각" })
  createdAt: Date;
}

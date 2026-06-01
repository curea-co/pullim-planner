import { Exclude, Expose, Transform } from "class-transformer";
import { DateTime } from "luxon";
import { Column, Entity, Index, ManyToOne } from "typeorm";

import { BaseModel } from "../common/entities/base.model";
import {
  DateTimeTransformer,
  dateTimeToIso,
} from "../common/utils/datetime.util";
import { AuthUser } from "./auth-user.entity";
import { AuthProvider } from "./enums/auth-provider.enum";

export { AuthProvider } from "./enums/auth-provider.enum";

/**
 * 사용자 인증 제공자. 본체 `UserAuthProvider` 정렬. 비밀번호(bcrypt 해시)는 EMAIL
 * 제공자에만 저장한다. (provider, providerId) 는 살아있는 행에 한해 유니크
 * (partial index 는 마이그레이션이 소유).
 */
@Entity("auth_user_providers")
@Index("idx_auth_user_providers_provider_id", ["provider", "providerId"])
export class AuthUserProvider extends BaseModel {
  @Column({
    type: "enum",
    enum: AuthProvider,
    comment: "인증 제공자 (email/kakao/naver)",
  })
  @Expose()
  provider: AuthProvider;

  @Column({ comment: "제공자별 고유 식별자 (이메일 제공자는 이메일)" })
  @Expose()
  providerId: string;

  @Exclude()
  @Column({
    type: "varchar",
    nullable: true,
    comment: "해싱된 비밀번호 (이메일 제공자만)",
  })
  password: string | null;

  @ManyToOne(() => AuthUser, (user) => user.authProviders, {
    onDelete: "CASCADE",
  })
  @Exclude()
  user: AuthUser;

  @Column({ type: "uuid", comment: "사용자 FK" })
  @Expose()
  userId: string;

  @Column({
    type: "int",
    default: 0,
    comment: "연속 로그인 실패 횟수 (이메일 제공자만 사용)",
  })
  @Exclude()
  failedLoginCount: number;

  @Column({
    type: "timestamptz",
    nullable: true,
    transformer: DateTimeTransformer,
    comment: "계정 잠금 시점 (null 이면 잠금 아님)",
  })
  @Transform(dateTimeToIso, { toPlainOnly: true })
  @Exclude()
  lockedAt: DateTime | null;

  /**
   * AuthUserProvider 엔티티를 생성한다.
   * @param params - provider·providerId·password(해시)·user
   * @returns 저장 직전 상태의 AuthUserProvider 엔티티
   */
  static create(params: {
    provider: AuthProvider;
    providerId: string;
    password?: string | null;
    user: AuthUser;
  }): AuthUserProvider {
    const entity = new AuthUserProvider();
    entity.provider = params.provider;
    entity.providerId = params.providerId;
    entity.password = params.password ?? null;
    entity.user = params.user;
    entity.failedLoginCount = 0;
    entity.lockedAt = null;
    return entity;
  }
}
